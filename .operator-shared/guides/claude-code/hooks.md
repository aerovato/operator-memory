# Claude Code Hooks

Last Updated: October 2, 2026

Settings-hook system reference, focused on what the Operator plugin's `hooks/hooks.json` needs.

## Configuration formats

Plugin hooks live in `hooks/hooks.json` (path overridable via the manifest `hooks` field, string path or inline object) with a wrapper:

```json
{
  "description": "Operator preamble injection",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "operator-helper",
            "args": ["preamble"],
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Settings files (`~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed policy) use the direct format without the wrapper. Plugin hooks merge with settings hooks and run in parallel; there is no ordering guarantee between hooks.

Hooks are loaded at session start; configuration changes require a restart or `/reload-plugins`. `/hooks` lists loaded hooks; `claude --debug` logs registration and execution.

## Handler types

Five types: `command` (shell), `http` (POST JSON, same output schema), `mcp_tool`, `prompt` (single-turn LLM evaluation), `agent` (experimental subagent). Operator needs only `command`.

### Command handlers: exec form vs shell form

- Exec form (`args` present): `command` resolves as an executable, spawned directly; each `args` element is one argument, no shell. Preferred whenever referencing path placeholders — no quoting hazards
- Shell form (`args` absent): string passed to `sh -c` (or PowerShell on Windows). Needed only for pipes and `&&`

Placeholders `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` substitute into `command` and `args` (exec form) and are exported as environment variables either way. Plugin hooks also substitute `${user_config.*}` in exec form only.

Common fields: `if` (permission-rule pre-filter, tool events only), `timeout` (default 600s for command/http/mcp_tool), `statusMessage`, `once` (skill frontmatter only), `async`/`asyncRewake` (background execution).

## Matchers

Evaluation depends on characters: `*`, `""`, or omitted matches all; letters/digits/`_`/`-`/space/`,`/`|` is exact-match (with `|`/`,` alternation); anything else is an unanchored JavaScript regex. SessionStart matches on `source` (`startup|resume|clear|compact|fork`); SubagentStart matches on agent type. A matcher added to an event without matcher support is silently ignored.

## Input contract

JSON on stdin. Common fields: `session_id`, `prompt_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`; `agent_id`/`agent_type` inside subagents. Event-specific fields per event (SessionStart adds `source`, SubagentStart adds `agent_id`/`agent_type`).

The handler should read `cwd` from stdin as the event working directory rather than trusting the process working directory.

## Output contract

- Exit 0 with non-JSON stdout: plain text (SessionStart adds it to context)
- Exit 0 with JSON stdout: parsed against the JSON output schema — `continue`, `stopReason`, `systemMessage`, `terminalSequence`, top-level `decision`/`reason` for some events, and `hookSpecificOutput` (requires `hookEventName`) carrying `additionalContext` and event-specific fields
- Exit 2: blocking error on events that can block (stderr fed to Claude); SessionStart is context-only and cannot block
- Other exit codes: non-blocking error, output ignored

Stdout must contain only the JSON object. `additionalContext`/`systemMessage`/plain stdout are capped at 10,000 characters each (see [`injection.md`](./injection.md)).

## Policy and restrictions

- `allowManagedHooksOnly` (managed settings) blocks user, project, local, and plugin hooks except plugins force-enabled in managed `enabledPlugins`
- `disableAllHooks: true` disables all non-managed hooks; `--bare` and `--safe-mode` skip them for a run
- Workspace trust gates project-scope hooks and frontmatter hooks in untrusted folders
- Built-in `sec-default` mod guards org-managed configuration from installed plugins

Document these in the adapter's troubleshooting surface: an Operator install can be silently hook-less under managed policy, and the `/operator:repair` flow should detect and explain that condition.

## Testing

Feed sample stdin JSON directly to the handler script and check exit code and stdout JSON:

```bash
echo '{"session_id":"t","cwd":"/proj","hook_event_name":"SessionStart","source":"startup"}' \
  | operator-helper preamble
```

`claude plugin validate <dir>` statically validates the plugin including its hook configuration, and `claude --debug` shows live hook execution.
