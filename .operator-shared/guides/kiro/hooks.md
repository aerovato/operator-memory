# Kiro Hooks

Last Updated: October 5, 2026

## Standalone hook files (IDE 1.x / CLI V3)

Hooks are standalone JSON files in `.kiro/hooks/` (project) or `~/.kiro/hooks/` (global). Any kebab-case `.json` filename works; a file may define multiple hooks. Hooks activate automatically when a session starts — no registration. Global discovery and injection are verified under the ordinary home; CLI `2.27.1` / KAS `0.66.22` V3 ignores `KIRO_HOME` for global hooks. See [configuration guidance](surfaces.md#configuration-scopes).

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "operator-memory",
      "trigger": "SessionStart",
      "action": { "type": "command", "command": "operator-helper preamble" }
    }
  ]
}
```

Fields:

- `version` — required, `"v1"`
- `hooks[].name` — required
- `hooks[].description` — optional
- `hooks[].trigger` — required, PascalCase
- `hooks[].matcher` — optional regex; what it matches depends on the trigger (tool name for tool triggers, file path for file triggers, prompt text for `UserPromptSubmit`; not evaluated for `SessionStart`/`Stop`/task triggers)
- `hooks[].action.type` — `"command"` (shell) or `"agent"` (inject prompt; cannot block)
- `hooks[].action.command` / `hooks[].action.prompt` — required per action type
- `hooks[].timeout` — seconds, default 60 in the main hooks reference; CLI pages document `timeout_ms` default 30000. The docs are inconsistent about which field and default apply to standalone files; verify against the installed version.
- `hooks[].enabled` — default `true`; set `false` to skip
- `hooks[].confirm` — optional confirmation prompt before a `Stop` command hook runs, with `options` (`id`, `label`, `run`) and an optional `confirmCommand` whose stdout JSON can suppress or replace the static prompt

`{{filePath}}` template substitution is available in commands for file-related triggers.

## Triggers

Availability per the trigger reference:

- `SessionStart` — IDE, CLI V3, Web. Use cases: inject workspace instructions, environment checks. This is the preamble injection point.
- `Stop` (agent turn completes) — all surfaces. Can return a `{"decision": "block", "reason": ...}` JSON on stdout to force the agent to continue with `reason` as a new user message.
- `UserPromptSubmit` — all surfaces. Prompt available via `USER_PROMPT` env var (IDE/CLI) or the stdin JSON `prompt` field.
- `PreToolUse` / `PostToolUse` — all surfaces. Matcher targets tool names.
- `PostFileCreate` / `PostFileSave` / `PostFileDelete` — IDE, CLI V3, Web. Only agent-made changes trigger these; manual editor edits do not.
- `PreTaskExec` / `PostTaskExec` — spec task lifecycle, IDE, CLI V3, Web.
- `SessionEnd` — CLI V3 only.
- `Manual` — Web on-demand; CLI V3 recognizes and lists but cannot invoke them; no v1 IDE equivalent (legacy IDE `userTriggered` hooks remain runnable).
- `AgentSpawn` — CLI 2.x name; V3 accepts `SessionStart` canonically with `AgentSpawn`/`agentSpawn` as compatibility spellings.

## Command contract

- Command actions run in the project root and receive the hook event as JSON on stdin: `hook_event_name`, `cwd`, `session_id`, plus `tool_name`/`tool_input`/`tool_response` for tool triggers (MCP tools use namespaced names like `@postgres/query`).
- Exit code 0: stdout is added to the agent's context for `SessionStart` and `UserPromptSubmit`; ignored for other triggers.
- Exit code 2: blocks the event for `PreToolUse`, `UserPromptSubmit`, `PreTaskExec`; stderr returned to the agent.
- Other non-zero: stderr shown to the user as a warning; execution proceeds (the tool still runs for `PostToolUse`).
- Agent-prompt actions consume credits (they trigger an agent loop); command actions do not.

## Tool matchers

Matchers accept canonical internal names (`fs_read`, `fs_write`, `execute_bash`, `use_aws`) and aliases (`read`, `write`, `shell`, `aws`), category tags, and source prefixes matched by regex: `@mcp` (all MCP tools), `@powers`, `@builtin`, `@git` (server), `@git/status` (specific tool), `*` (everything).

## Caching

`cache_ttl_seconds` caches successful hook results (`0` default, no caching). `SessionStart`/`AgentSpawn` hooks are never cached — they run once per session regardless.

## Legacy formats

- CLI legacy engines: embedded camelCase agent-profile hooks precede the standalone format. Profile configuration is outside Operator's general installation scope; details live in [injection verification](./injection.md).
- IDE 0.x: `.kiro.hook` format with `when`/`then` structure; trigger renames map camelCase to the PascalCase list above. IDE migrates via the Agent Hooks panel.

## Notes for adapter design

- Global `SessionStart` command hooks are the documented automatic main-agent preamble mechanism. No documented general hook injects the complete preamble into subagents; see [subagent behavior](agents.md).
- Keep inherited steering for subagent instructions. Steering-based Helper execution is agent-driven loading, not guaranteed automatic injection.
- Non-zero `SessionStart` warns the user and proceeds; failed command output is not an injected preamble. Steering must not tell an agent to continue after an unexpected Helper execution failure.
- New/changed hook files are picked up at session start; a running session does not reload them.
