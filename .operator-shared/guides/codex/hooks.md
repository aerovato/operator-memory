# Codex Hooks

Last Updated: September 24, 2026

Verified lifecycle-hook discovery, execution, context injection, and trust behavior.

## Hook Discovery

Codex discovers hooks next to active configuration layers as `hooks.json` or inline `[hooks]` tables in `config.toml`. Common locations include:

- `~/.codex/hooks.json`
- `~/.codex/config.toml`
- `<repo>/.codex/hooks.json`
- `<repo>/.codex/config.toml`

Enabled plugins can also bundle lifecycle hooks. Codex loads matching hooks from all active sources; higher-precedence configuration does not replace lower-precedence hooks. Multiple matching command hooks for one event launch concurrently.

Project-local hooks load only for trusted projects. User, system, managed, and enabled-plugin hooks follow their own active-layer rules.

## Trust

Non-managed hooks must be reviewed and trusted before they run. Source-verified: Codex records trust against a `sha256` hash of the normalized handler definition — event, matcher, statusMessage, and the single normalized handler config (command with platform selection, clamped timeout, configured async, effective `additionalContextLimit`). Any change to that normalized definition marks the hook `Modified` and disables it pending re-trust. Cosmetic source-format differences that normalize identically keep trust.

Trust state is stored as `[hooks.state]` in user config, keyed by `<key_source>:<event_label>:<group_index>:<handler_index>`. For plugin hooks the key source is `<plugin_id>:<relative hooks path>`, not the versioned install path, and the hash covers only the literal handler definition. Updating a plugin therefore keeps trust as long as the hook definition in `hooks.json` is unchanged; behavior may evolve freely in the referenced script, and commands should use `"$PLUGIN_ROOT/..."` so the command string stays version-independent.

The TUI automatically shows a startup trust-review modal whenever any enabled hook is untrusted or modified, offering "Trust all and continue" or "Continue without trusting"; no separate user reminder is needed for initial trust. CLI users inspect and manage hooks with `/hooks`. Managed hooks supplied through system, MDM, cloud, or `requirements.toml` policy are trusted by policy and cannot be disabled through the user hook browser. A `--dangerously-bypass-hook-trust` CLI flag exists but is per-invocation and unsafe for distribution.

Installing or enabling a plugin does not trust its bundled hooks.

## Plugin-Bundled Hooks

A portable plugin declares OpenAI-specific hook configuration through `extensions.com.openai.hooks`. If no explicit hook setting exists, Codex discovers `hooks/hooks.json` in the plugin root.

Hook paths:

- Start with `./`.
- Resolve relative to the plugin root.
- Must remain inside the plugin root.
- Can be a path, list of paths, inline hooks object, or list of inline objects.

Plugin command hooks receive:

- `PLUGIN_ROOT`, the installed plugin root.
- `PLUGIN_DATA`, the plugin's writable data directory.
- Compatibility aliases `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`.

An explicit manifest hook setting replaces default `hooks/hooks.json` discovery for that plugin.

## Command Hooks

Codex currently supports `command` and `mcp_tool` handlers. It parses but skips `prompt` and `agent` handlers.

Command hooks:

- Receive one JSON object on stdin.
- Run with the session `cwd` as their working directory.
- Run synchronously by default.
- Run through the user's shell at host-user privilege, outside the agent sandbox (still subject to normal OS permissions); the session permission mode does not constrain them.
- Support a Windows-specific `commandWindows` override.
- Default to a 600-second timeout for most events.
- Can run in the background with `async: true`, subject to event limitations.

Common input fields include `session_id`, `transcript_path`, `cwd`, `hook_event_name`, and `model`. Most session and turn events also include `permission_mode`.

The transcript path is explicitly not a stable interface.

## `SessionStart`

`SessionStart` is queued at session creation and runs at the start of the next turn, before the turn's first model request. Model-backed pre-turn compaction can run before the queued hook. Its `source` is one of:

- `startup`
- `resume`
- `clear`
- `compact`
- `fork`

Handlers are matched on the source string. Resume keeps the thread's original identity; fork creates a new thread identity with lineage; compaction stays on the same thread and re-fires `SessionStart` with `source: "compact"`.

Plain text on stdout is added as extra developer context. JSON output can provide `hookSpecificOutput.additionalContext`, also added as developer context, and a `systemMessage` surfaced as a warning. Source-verified: the context is appended to conversation history as a `developer` message, persisted to the rollout, and re-appended (not deduplicated) when `SessionStart` fires again on resume or compaction. Initial world-state and `AGENTS.md` context precede this developer message; the submitted user input follows it. `continue: false` is honored only for `SessionStart`, not `SubagentStart`.

Compaction removes prior developer messages from active context, adds a user-role summary, and then re-fires `SessionStart` with `source: "compact"`. Fork copies persisted rollout history and truncates only at user-message boundaries, so developer context inserted before the first user message remains in the fork.

A failed or invalid hook never aborts the session; only `continue: false` stops the turn.

## `SubagentStart`

`SubagentStart` runs when a user-facing subagent thread spawns. Its input adds:

- `turn_id`
- `agent_id`
- `agent_type`
- `permission_mode`

Only `ThreadSpawn`-source subagents receive `SubagentStart`; internal/system subagent sources skip start hooks entirely. The common `session_id` field carries the shared root session identity, not necessarily the immediate parent thread id. Subagent hooks can return `hookSpecificOutput.additionalContext` and `systemMessage`; `continue: false` does not stop the subagent from starting.

## Context Output Limits

Codex limits each model-visible hook-output message to roughly 2,500 tokens by default. Oversized output is spilled to `<tmp>/hook_outputs/<thread_id>/`; the model receives a head-and-tail preview and the saved-file path rather than the entire value. The limit applies to `SessionStart`, `SubagentStart`, `PreToolUse`, `PostToolUse`, and `UserPromptSubmit`.

`additionalContextLimit` controls this behavior for command-hook additional context:

- Omitted: use the approximate 2,500-token default.
- Positive integer: use that approximate threshold.
- `0`: pass the full additional context directly to the model.

OpenAI warns that large context from multiple hooks and plugins can degrade model performance or consume the context window.

## Failures and Visibility

Exit `0` with no output is success. Hook output can include `systemMessage` for a warning in the UI or event stream. Spawn errors, non-zero exits, invalid JSON, and timeouts leave a persistent hook-history entry; a returned `systemMessagep` is shown as a warning entry.

The hook documentation defines event-specific block and continuation behavior, but does not state that a failed `SessionStart` or `SubagentStart` command prevents the model from continuing. MCP-tool hooks also fail open when their server or tool is unavailable.

## Other Relevant Events

- `PreCompact` runs before manual or automatic compaction.
- `PostCompact` runs after compaction.
- `SessionEnd` runs for the main thread, not subagents, when a session is archived, deleted, closed normally, or unloaded after inactivity.
- `UserPromptSubmit` can add developer context before a submitted prompt, but runs per turn rather than once per session.
- `Stop` and `SubagentStop` can request continuation after an agent would otherwise stop.

## Sources

- [Hooks](https://learn.chatgpt.com/docs/hooks)
- [Package your plugin](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
