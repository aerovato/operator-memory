"""Operator Memory integration for Code Puppy."""

from __future__ import annotations

import asyncio
import os
import subprocess
import threading
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress
from typing import Any

from code_puppy.callbacks import register_callback
from code_puppy.config import get_current_session_name
from code_puppy.messaging import emit_warning
from code_puppy.tools.subagent_context import get_conversation_root_id
from pydantic_ai import ModelRequest, RunContext, UserPromptPart
from pydantic_ai.messages import ModelMessage, ModelResponse
from pydantic_ai.models import (
    KnownModelName,
    Model,
    ModelRequestParameters,
    StreamedResponse,
)
from pydantic_ai.models.wrapper import WrapperModel
from pydantic_ai.settings import ModelSettings

_MARKER_KEY = "operator_memory"
_MARKER_VALUE = "synthetic-preamble-v1"

try:
    from code_puppy.callbacks import CustomCommandResult
except ImportError:
    try:
        # Code Puppy < 0.0.698 exposes the same contract in the
        # customizable-commands plugin.
        from code_puppy.plugins.customizable_commands.register_callbacks import (
            MarkdownCommandResult as CustomCommandResult,
        )
    except ImportError:
        CustomCommandResult = None

_RENDER_TIMEOUT_SECONDS = 30
_COMMAND_TIMEOUT_SECONDS = 60
_render_tasks: dict[str, asyncio.Task[str]] = {}
_update_launched = False

_COMMANDS = {
    "operator:user-init": (
        "Initialize Operator User Instructions",
        ("user init", "user guide"),
        "Follow the instructions in the guide output above.",
    ),
    "operator:project-init": (
        "Initialize Operator Project",
        ("project init", "project guide"),
        "Follow the instructions in the guide output above.",
    ),
    "operator:index": (
        "Build or refresh the Operator Project Index",
        ("index status", "index guide"),
        "Follow the instructions in the guide output above.",
    ),
    "operator:repair": (
        "Repair Operator",
        ("memory check",),
        "If the output says `No issues detected.`, no action is needed and you may stop. "
        "Otherwise, repair only the reported Operator memory issues; do not initialize "
        "uninitialized partitions. Rerun `operator-helper memory check` until it succeeds, "
        "then read the applicable Operator memory before continuing.",
    ),
}


class OperatorModel(WrapperModel):
    """Inject an immutable Operator preamble into final model requests."""

    def __init__(self, wrapped: Model[Any] | KnownModelName, conversation_key: str):
        super().__init__(wrapped)
        self._conversation_key = conversation_key

    async def request(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> ModelResponse:
        transformed = await _inject_preamble(messages, self._conversation_key)
        return await self.wrapped.request(
            transformed, model_settings, model_request_parameters
        )

    @asynccontextmanager
    async def request_stream(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
        run_context: RunContext[Any] | None = None,
    ) -> AsyncGenerator[StreamedResponse]:
        transformed = await _inject_preamble(messages, self._conversation_key)
        async with self.wrapped.request_stream(
            transformed, model_settings, model_request_parameters, run_context
        ) as response:
            yield response


async def _inject_preamble(
    messages: list[ModelMessage], conversation_key: str
) -> list[ModelMessage]:
    preamble = await _get_preamble(conversation_key)
    transformed = [message for message in messages if not _is_operator_request(message)]
    transformed.insert(
        0,
        ModelRequest(
            parts=[UserPromptPart(content=preamble)],
            metadata={_MARKER_KEY: _MARKER_VALUE},
        ),
    )
    return transformed


def _is_operator_request(message: ModelMessage) -> bool:
    return (
        isinstance(message, ModelRequest)
        and message.metadata is not None
        and message.metadata.get(_MARKER_KEY) == _MARKER_VALUE
    )


async def _get_preamble(conversation_key: str) -> str:
    task = _render_tasks.get(conversation_key)
    if task is None:
        task = asyncio.create_task(_render_preamble(conversation_key))
        _render_tasks[conversation_key] = task
    return await asyncio.shield(task)


async def _render_preamble(conversation_key: str) -> str:
    environment = os.environ.copy()
    environment["OPERATOR_HELPER_SKIP_UPDATE"] = "1"
    process: asyncio.subprocess.Process | None = None
    try:
        process = await asyncio.create_subprocess_exec(
            "operator-helper",
            "preamble",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=environment,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=_RENDER_TIMEOUT_SECONDS
        )
        content = _remove_process_newline(stdout.decode(errors="replace"))
        if process.returncode == 0 and content:
            return content
        detail = _remove_process_newline(stderr.decode(errors="replace"))
        reason = detail or f"operator-helper exited with status {process.returncode}"
    except asyncio.CancelledError:
        if process is not None:
            await _stop_process(process)
        raise
    except TimeoutError:
        if process is not None:
            await _stop_process(process)
        reason = "operator-helper preamble timed out"
    except OSError as error:
        if process is not None:
            await _stop_process(process)
        reason = str(error)

    emit_warning(
        "Operator Memory could not render for this conversation. "
        "Run `operator-helper install code-puppy` to repair the integration."
    )
    return (
        "<operator-diagnostic>\n"
        "Operator Memory could not render its preamble. Continue without Operator Memory, "
        "help the user repair `operator-helper`, then ask them to start a new conversation.\n"
        f"Failure: {reason}\n"
        "</operator-diagnostic>"
    )


async def _stop_process(process: asyncio.subprocess.Process) -> None:
    with suppress(ProcessLookupError):
        process.kill()
    await process.wait()


def _remove_process_newline(value: str) -> str:
    if value.endswith("\r\n"):
        return value[:-2]
    if value.endswith("\n"):
        return value[:-1]
    return value


def _conversation_key() -> str:
    return get_conversation_root_id() or get_current_session_name()


@asynccontextmanager
async def _agent_run_context(
    _agent: Any, pydantic_agent: Any, _group_id: str, _mcp_servers: Any
) -> AsyncGenerator[None]:
    model = pydantic_agent.model
    if model is None:
        yield
        return
    if _is_dbos_agent(pydantic_agent):
        _warn_dbos_incompatible()
        yield
        return
    with pydantic_agent.override(model=OperatorModel(model, _conversation_key())):
        yield


def _is_dbos_agent(pydantic_agent: Any) -> bool:
    # DBOSAgent installs its own captured DBOSModel through a nested
    # override inside run(), which supersedes any override applied here.
    # Duck-type: avoid importing the optional durable_exec module.
    return hasattr(pydantic_agent, "_dbos_overrides")


_DBOS_WARNED = False


def _warn_dbos_incompatible() -> None:
    global _DBOS_WARNED
    if _DBOS_WARNED:
        return
    _DBOS_WARNED = True
    emit_warning(
        "Operator Memory preamble injection is disabled: DBOS durable execution "
        "supersedes the model override it relies on. Disable DBOS to restore "
        "Operator Memory: /set enable_dbos false, then restart Code Puppy."
    )


async def _session_end() -> None:
    tasks = tuple(_render_tasks.values())
    _render_tasks.clear()
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


def _custom_command(_command: str, name: str) -> CustomCommandResult | None:
    definition = _COMMANDS.get(name)
    if definition is None:
        return None

    version = _run_helper(("version",))
    if version[0] != 0:
        diagnostic = (
            "Operator Helper is unavailable. Help the user repair the missing "
            "operator-helper command (npm: @aerovato/operator-helper). Validate the "
            f"repair by rerunning `operator-helper version`. Once it succeeds, ask the "
            f"user to rerun `/{name}`."
        )
        content = "\n\n".join(
            (
                _command_output("operator-helper version 2>&1", version[1]),
                _tag("operator-diagnostic", diagnostic),
            )
        )
        return CustomCommandResult(content)

    _, operations, instructions = definition
    outputs = []
    for operation in operations:
        arguments = tuple(operation.split())
        result = _run_helper(arguments)
        outputs.append(_command_output(f"operator-helper {operation} 2>&1", result[1]))
    outputs.append(_tag("operator-instructions", instructions))
    return CustomCommandResult("\n\n".join(outputs))


def _run_helper(arguments: tuple[str, ...]) -> tuple[int, str]:
    try:
        result = subprocess.run(
            ("operator-helper", *arguments),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=_COMMAND_TIMEOUT_SECONDS,
            check=False,
        )
        return result.returncode, _remove_process_newline(result.stdout)
    except (OSError, subprocess.TimeoutExpired) as error:
        return 1, str(error)


def _command_output(command: str, output: str) -> str:
    return (
        "<operator-command>\n"
        f"<command>{command}</command>\n"
        "<output>\n"
        f"{output}\n"
        "</output>\n"
        "</operator-command>"
    )


def _tag(name: str, content: str) -> str:
    return f"<{name}>\n{content}\n</{name}>"


def _custom_command_help() -> list[tuple[str, str]]:
    return [(name, definition[0]) for name, definition in _COMMANDS.items()]


_UPDATE_NOTE = "Operator Updated · Restart Code Puppy to apply"
_update_note_pending = False


def _launch_update() -> None:
    global _update_launched
    if _update_launched:
        return
    _update_launched = True
    try:
        process = subprocess.Popen(
            ("operator-helper", "install", "code-puppy"),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            creationflags=(
                subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
                if os.name == "nt"
                else 0
            ),
            start_new_session=os.name != "nt",
        )
    except OSError:
        return
    threading.Thread(target=_monitor_update, args=(process,), daemon=True).start()


def _monitor_update(process: subprocess.Popen[str]) -> None:
    global _update_note_pending
    try:
        output = process.communicate()[0] or ""
    except Exception:
        return
    if process.returncode == 0 and "plugin updated" in output:
        _update_note_pending = True
        _paint_status_indicator(_UPDATE_NOTE)
        _emit_update_notice()


def _emit_update_notice() -> None:
    try:
        from rich.text import Text

        from code_puppy.messaging import emit_warning

        notice = Text()
        notice.append("Operator Updated · ", style="bold magenta")
        notice.append("Restart Code Puppy to apply", style="magenta")
        emit_warning(notice)
    except Exception:
        pass


_STARTUP_INDICATOR = "Operator Ready"
_STATUS_INDICATOR = "   Operator Ready"
_active_runs = 0


def _paint_status_indicator(text: str) -> None:
    try:
        from code_puppy.messaging.bottom_bar import get_bottom_bar

        get_bottom_bar().set_status_suffix(text)
    except Exception:
        pass


async def _show_status_indicator() -> None:
    global _update_note_pending
    if _update_note_pending:
        _update_note_pending = False
        return
    _paint_status_indicator(_STARTUP_INDICATOR)


async def _agent_run_start(*_args: Any) -> None:
    global _active_runs
    _active_runs += 1
    _paint_status_indicator(_STATUS_INDICATOR)


async def _agent_run_end(*_args: Any) -> None:
    global _active_runs
    _active_runs = max(0, _active_runs - 1)
    if _active_runs == 0:
        _paint_status_indicator("")


register_callback("agent_run_context", _agent_run_context)
register_callback("session_end", _session_end)
if CustomCommandResult is not None:
    register_callback("custom_command", _custom_command)
    register_callback("custom_command_help", _custom_command_help)
else:
    emit_warning(
        "Operator commands are disabled: this Code Puppy version is too old to "
        "process command output as user input. Preamble injection still works. "
        "Upgrade Code Puppy to enable the /operator:* commands."
    )
register_callback("startup", _show_status_indicator)
register_callback("agent_run_start", _agent_run_start)
register_callback("agent_run_end", _agent_run_end)
_launch_update()
