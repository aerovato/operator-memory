from __future__ import annotations

import asyncio
import importlib.util
import subprocess
import sys
from collections.abc import AsyncGenerator, Generator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import pytest
from pydantic_ai import ModelRequest, RunContext, UserPromptPart
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models import ModelRequestParameters, ModelResponse, StreamedResponse
from pydantic_ai.models.test import TestModel
from pydantic_ai.settings import ModelSettings

PLUGIN_PATH = Path(__file__).parents[1] / "operator" / "register_callbacks.py"


class RecordingModel(TestModel):
    def __init__(self) -> None:
        super().__init__(custom_output_text="ok")
        self.requests: list[list[ModelMessage]] = []

    async def request(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> ModelResponse:
        self.requests.append(list(messages))
        return await super().request(messages, model_settings, model_request_parameters)

    @asynccontextmanager
    async def request_stream(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
        run_context: RunContext[Any] | None = None,
    ) -> AsyncGenerator[StreamedResponse]:
        self.requests.append(list(messages))
        async with super().request_stream(
            messages, model_settings, model_request_parameters, run_context
        ) as response:
            yield response


@pytest.fixture(scope="module")
def plugin() -> Any:
    spec = importlib.util.spec_from_file_location("operator_test_plugin", PLUGIN_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(subprocess, "Popen", lambda *args, **kwargs: object())
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
    return module


@pytest.fixture(autouse=True)
def clear_plugin_state(plugin: Any) -> Generator[None, None, None]:
    plugin._render_tasks.clear()
    yield
    for task in plugin._render_tasks.values():
        if not task.done():
            task.cancel()
    plugin._render_tasks.clear()


def request(
    content: str,
    instructions: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> ModelRequest:
    return ModelRequest(
        parts=[UserPromptPart(content=content)],
        instructions=instructions,
        metadata=metadata,
    )


def request_parameters() -> ModelRequestParameters:
    return ModelRequestParameters()


def user_prompt_content(message: ModelMessage) -> str:
    assert isinstance(message, ModelRequest)
    part = message.parts[0]
    assert isinstance(part, UserPromptPart)
    assert isinstance(part.content, str)
    return part.content


@pytest.mark.asyncio
async def test_request_inserts_one_preamble_without_mutating_input(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    async def render(_key: str) -> str:
        return "operator preamble"

    monkeypatch.setattr(plugin, "_render_preamble", render)
    wrapped = RecordingModel()
    model = plugin.OperatorModel(wrapped, "conversation")
    original_request = request("hello", instructions="exact instructions")
    messages = [original_request]

    await model.request(messages, None, request_parameters())

    assert messages == [original_request]
    assert wrapped.requests[0][1] is original_request
    assert original_request.instructions == "exact instructions"
    synthetic = wrapped.requests[0][0]
    assert isinstance(synthetic, ModelRequest)
    assert synthetic.instructions is None
    assert user_prompt_content(synthetic) == "operator preamble"
    assert synthetic.metadata == {plugin._MARKER_KEY: plugin._MARKER_VALUE}


@pytest.mark.asyncio
async def test_request_replaces_only_prior_operator_request(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    async def render(_key: str) -> str:
        return "current"

    monkeypatch.setattr(plugin, "_render_preamble", render)
    wrapped = RecordingModel()
    model = plugin.OperatorModel(wrapped, "conversation")
    prior = request(
        "old",
        metadata={plugin._MARKER_KEY: plugin._MARKER_VALUE},
    )
    unrelated = request("keep", metadata={plugin._MARKER_KEY: "someone-else"})

    await model.request([prior, unrelated], None, request_parameters())

    sent = wrapped.requests[0]
    assert len(sent) == 2
    assert sent[1] is unrelated
    assert user_prompt_content(sent[0]) == "current"


@pytest.mark.asyncio
async def test_request_stream_uses_identical_transform(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    async def render(_key: str) -> str:
        return "stream preamble"

    monkeypatch.setattr(plugin, "_render_preamble", render)
    wrapped = RecordingModel()
    model = plugin.OperatorModel(wrapped, "conversation")
    original = request("hello", instructions="unchanged")

    async with model.request_stream([original], None, request_parameters()):
        pass

    sent = wrapped.requests[0]
    assert user_prompt_content(sent[0]) == "stream preamble"
    assert sent[1] is original
    assert isinstance(sent[1], ModelRequest)
    assert sent[1].instructions == "unchanged"


@pytest.mark.asyncio
async def test_concurrent_first_requests_share_one_render(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    calls = 0
    release = asyncio.Event()

    async def render(_key: str) -> str:
        nonlocal calls
        calls += 1
        await release.wait()
        return "immutable"

    monkeypatch.setattr(plugin, "_render_preamble", render)
    first = asyncio.create_task(plugin._get_preamble("conversation"))
    second = asyncio.create_task(plugin._get_preamble("conversation"))
    await asyncio.sleep(0)
    release.set()

    assert await asyncio.gather(first, second) == ["immutable", "immutable"]
    assert await plugin._get_preamble("conversation") == "immutable"
    assert calls == 1


@pytest.mark.asyncio
async def test_conversation_roots_and_rotated_sessions_are_isolated(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    renders: list[str] = []
    root: str | None = None
    session = "session-one"

    async def render(key: str) -> str:
        renders.append(key)
        return f"preamble:{key}"

    monkeypatch.setattr(plugin, "_render_preamble", render)
    monkeypatch.setattr(plugin, "get_conversation_root_id", lambda: root)
    monkeypatch.setattr(plugin, "get_current_session_name", lambda: session)

    assert (
        await plugin._get_preamble(plugin._conversation_key()) == "preamble:session-one"
    )
    session = "session-two"
    assert (
        await plugin._get_preamble(plugin._conversation_key()) == "preamble:session-two"
    )
    root = "acp-one"
    assert await plugin._get_preamble(plugin._conversation_key()) == "preamble:acp-one"
    assert await plugin._get_preamble(plugin._conversation_key()) == "preamble:acp-one"
    root = "acp-two"
    assert await plugin._get_preamble(plugin._conversation_key()) == "preamble:acp-two"
    assert renders == ["session-one", "session-two", "acp-one", "acp-two"]


@pytest.mark.asyncio
async def test_helper_failure_is_an_immutable_diagnostic(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    warnings: list[str] = []

    async def missing_helper(*_args: Any, **_kwargs: Any) -> None:
        raise FileNotFoundError("missing")

    monkeypatch.setattr(asyncio, "create_subprocess_exec", missing_helper)
    monkeypatch.setattr(plugin, "emit_warning", warnings.append)

    first = await plugin._get_preamble("conversation")
    second = await plugin._get_preamble("conversation")

    assert first == second
    assert first.startswith("<operator-diagnostic>")
    assert "missing" in first
    assert len(warnings) == 1


@pytest.mark.asyncio
async def test_render_cancellation_stops_helper(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    class Process:
        returncode = None
        killed = False
        waited = False

        async def communicate(self) -> tuple[bytes, bytes]:
            await asyncio.Event().wait()
            raise AssertionError("unreachable")

        def kill(self) -> None:
            self.killed = True

        async def wait(self) -> int:
            self.waited = True
            return 0

    process = Process()

    async def create_process(*_args: Any, **_kwargs: Any) -> Process:
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", create_process)
    task = asyncio.create_task(plugin._render_preamble("conversation"))
    await asyncio.sleep(0)
    task.cancel()

    with pytest.raises(asyncio.CancelledError):
        await task
    assert process.killed
    assert process.waited


@pytest.mark.asyncio
async def test_stop_process_tolerates_an_already_exited_helper(plugin: Any):
    class Process:
        waited = False

        def kill(self) -> None:
            raise ProcessLookupError

        async def wait(self) -> int:
            self.waited = True
            return 0

    process = Process()
    await plugin._stop_process(process)
    assert process.waited


@pytest.mark.asyncio
async def test_session_end_clears_cached_tasks(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    calls = 0

    async def render(_key: str) -> str:
        nonlocal calls
        calls += 1
        return str(calls)

    monkeypatch.setattr(plugin, "_render_preamble", render)
    assert await plugin._get_preamble("conversation") == "1"
    await plugin._session_end()
    assert await plugin._get_preamble("conversation") == "2"


@pytest.mark.asyncio
async def test_session_end_awaits_cancelled_render(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    started = asyncio.Event()
    cancelled = asyncio.Event()

    async def render(_key: str) -> str:
        started.set()
        try:
            await asyncio.Event().wait()
            raise AssertionError("unreachable")
        finally:
            cancelled.set()

    monkeypatch.setattr(plugin, "_render_preamble", render)
    task = asyncio.create_task(plugin._get_preamble("conversation"))
    await started.wait()

    await plugin._session_end()

    with pytest.raises(asyncio.CancelledError):
        await task
    assert cancelled.is_set()
    assert plugin._render_tasks == {}


def test_commands_return_agent_input_and_preserve_unknown_commands(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    calls: list[tuple[str, ...]] = []

    def run(arguments: tuple[str, ...]) -> tuple[int, str]:
        calls.append(arguments)
        return 0, "output"

    monkeypatch.setattr(plugin, "_run_helper", run)
    result = plugin._custom_command("/operator:user-init", "operator:user-init")

    assert result.__class__.__name__ == "CustomCommandResult"
    assert "<command>operator-helper user init 2>&1</command>" in result.content
    assert "<command>operator-helper user guide 2>&1</command>" in result.content
    assert "<operator-instructions>" in result.content
    assert calls == [("version",), ("user", "init"), ("user", "guide")]
    assert plugin._custom_command("/unknown", "unknown") is None


def test_command_helper_failure_skips_operations(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    calls: list[tuple[str, ...]] = []

    def run(arguments: tuple[str, ...]) -> tuple[int, str]:
        calls.append(arguments)
        return 1, "not found"

    monkeypatch.setattr(plugin, "_run_helper", run)
    result = plugin._custom_command("/operator:index", "operator:index")

    assert "<operator-diagnostic>" in result.content
    assert "operator-helper version 2>&1" in result.content
    assert "operator-helper index status" not in result.content
    assert calls == [("version",)]


def test_command_help_lists_canonical_commands(plugin: Any) -> None:
    assert plugin._custom_command_help() == [
        ("operator:user-init", "Initialize Operator User Instructions"),
        ("operator:project-init", "Initialize Operator Project"),
        ("operator:index", "Build or refresh the Operator Project Index"),
        ("operator:repair", "Repair Operator"),
    ]


def test_automatic_update_launches_once(plugin: Any, monkeypatch: pytest.MonkeyPatch):
    launches: list[tuple[tuple[str, ...], dict[str, Any]]] = []

    def launch(arguments: tuple[str, ...], **kwargs: Any) -> object:
        launches.append((arguments, kwargs))
        return object()

    monkeypatch.setattr(subprocess, "Popen", launch)
    plugin._update_launched = False
    plugin._launch_update()
    plugin._launch_update()

    assert len(launches) == 1
    assert launches[0][0] == ("operator-helper", "install", "code-puppy")
    assert launches[0][1]["stdout"] is subprocess.PIPE
    assert launches[0][1]["stderr"] is subprocess.DEVNULL
    if sys.platform == "win32":
        assert launches[0][1]["creationflags"] == (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    else:
        assert launches[0][1]["start_new_session"] is True


@pytest.fixture
def status_bar(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    calls: list[str] = []

    class Bar:
        def set_status_suffix(self, text: str) -> None:
            calls.append(text)

    monkeypatch.setitem(
        sys.modules,
        "code_puppy.messaging.bottom_bar",
        type(sys)("code_puppy.messaging.bottom_bar"),
    )
    monkeypatch.setattr(
        sys.modules["code_puppy.messaging.bottom_bar"],
        "get_bottom_bar",
        lambda: Bar(),
        raising=False,
    )
    return calls


@pytest.fixture(autouse=True)
def reset_run_count(plugin: Any) -> Generator[None, None, None]:
    plugin._active_runs = 0
    yield
    plugin._active_runs = 0


@pytest.mark.asyncio
async def test_startup_paints_status_indicator_suffix(
    plugin: Any, status_bar: list[str]
):
    await plugin._show_status_indicator()

    assert status_bar == [plugin._STARTUP_INDICATOR]
    assert plugin._STARTUP_INDICATOR == "Operator Ready"


@pytest.mark.asyncio
async def test_startup_indicator_tolerates_missing_bottom_bar(
    plugin: Any, monkeypatch: pytest.MonkeyPatch
):
    def raise_import_error() -> Any:
        raise ImportError("bottom_bar unavailable")

    monkeypatch.setitem(
        sys.modules,
        "code_puppy.messaging.bottom_bar",
        type(sys)("code_puppy.messaging.bottom_bar"),
    )
    monkeypatch.setattr(
        sys.modules["code_puppy.messaging.bottom_bar"],
        "get_bottom_bar",
        raise_import_error,
        raising=False,
    )

    await plugin._show_status_indicator()


@pytest.mark.asyncio
async def test_indicator_persists_across_nested_runs_and_clears_at_idle(
    plugin: Any, status_bar: list[str]
):
    await plugin._agent_run_start("code_puppy", "model", "session-1")
    await plugin._agent_run_start("subagent", "model", "session-2")
    await plugin._agent_run_end("subagent", "model", "session-2")

    assert status_bar == [plugin._STATUS_INDICATOR, plugin._STATUS_INDICATOR]

    await plugin._agent_run_end(
        "code_puppy", "model", "session-1", True, None, "done", None
    )

    assert status_bar[-1] == ""
    assert plugin._active_runs == 0


@pytest.mark.asyncio
async def test_indicator_run_end_never_drops_below_zero(
    plugin: Any, status_bar: list[str]
):
    await plugin._agent_run_end("code_puppy", "model")

    assert plugin._active_runs == 0
    assert status_bar == [""]


def test_update_monitor_paints_note_only_on_update(
    plugin: Any, status_bar: list[str], monkeypatch: pytest.MonkeyPatch
):
    emitted: list[bool] = []
    monkeypatch.setattr(plugin, "_emit_update_notice", lambda: emitted.append(True))

    class Finished:
        def __init__(self, output: str, returncode: int) -> None:
            self.output = output
            self.returncode = returncode

        def communicate(self) -> tuple[str, None]:
            return self.output, None

    plugin._monitor_update(Finished("✓ Code Puppy plugin updated\n", 0))
    plugin._monitor_update(Finished("✓ Code Puppy plugin is current\n", 0))
    plugin._monitor_update(Finished("✗ Could not install\n", 1))

    assert status_bar == [plugin._UPDATE_NOTE]
    assert plugin._update_note_pending is True
    assert emitted == [True]


@pytest.mark.asyncio
async def test_startup_preserves_painted_update_note(
    plugin: Any, status_bar: list[str]
):
    plugin._update_note_pending = True

    await plugin._show_status_indicator()

    assert status_bar == []


@pytest.mark.asyncio
async def test_update_monitor_failure_is_silent(plugin: Any, status_bar: list[str]):
    class Broken:
        def communicate(self) -> tuple[str, None]:
            raise OSError("stream lost")

    plugin._monitor_update(Broken())

    assert status_bar == []
