### Antigravity Hook API and Runtime

Last Updated: October 11, 2026

Native application hooks are shell commands exchanging JSON over stdin/stdout. This guide covers configuration, event contracts, runtime identity, and failures. See [Injection](./injection.md) for message placement, size, lifetime, and compaction. Runtime observations below apply to Linux ARM64 CLI `1.3.1`/`1.3.3`; graphical and Windows behavior is not established unless explicitly documented.

#### Configuration and Discovery

Workspace/global hook files are `.agents/hooks.json` and `~/.gemini/config/hooks.json`. CLI also accepts hooks in settings and installed plugins. Plugin-owned `hooks.json` avoids modifying user-owned hook files. CLI `/hooks` inspects loaded hooks; graphical surfaces expose customization controls.

The top level maps names directly to event configurations:

```json
{
  "example-hook": {
    "PreInvocation": [
      { "type": "command", "command": "example-hook-command", "timeout": 30 }
    ]
  }
}
```

`enabled: false` disables a named definition; omission enables it. Only command handlers are documented. `command` is required; `type` defaults to `command`; `timeout` is an integer in seconds, defaulting to 30. Invocation/Stop events contain handler arrays directly. Tool events contain matcher groups with nested `hooks` arrays. Tool matchers are regular expressions; empty string and `*` match all. Invocation/Stop matchers are ignored. There is no top-level Claude-style `hooks` wrapper.

#### Protocol and Events

Input arrives as JSON on stdin; output must be JSON on stdout with camelCase fields. **Raw preamble stdout is not a hook response.** JSON-encode the complete payload and keep diagnostics off stdout.

All events document `conversationId`, `workspacePaths` (absolute mounted directories), `transcriptPath`, `artifactDirectoryPath`, and `modelName`. CLI transcripts live under `~/.gemini/antigravity-cli/brain/<UUID>/.system_generated/logs/transcript.jsonl`; documented graphical application directories are `~/.gemini/antigravity` and `~/.gemini/antigravity-ide`.

##### Invocation Events

- `PreInvocation` runs before a model invocation; input adds `invocationNum` and `initialNumSteps`. Output supports optional `injectSteps`; each step may contain `ephemeralMessage`, `userMessage`, or `toolCall`.
- `PostInvocation` uses the same input and injected-step schema, after the model invocation. `terminationBehavior` accepts `force_continue`, `terminate`, or empty/omitted for default behavior. Termination here cannot prevent the model invocation already completed.

No native shell `SessionStart`, `SubagentStart`, `PreCompact`, `PostCompact`, prompt-prepend, or outgoing-context replacement hook is documented. Python SDK events are a different API and must not be imported into `hooks.json`.

##### Tool Events

`PreToolUse` input adds `toolCall.name`, `toolCall.args`, and `stepIdx`. Output requires `decision`: `allow`, `deny`, `ask`, `force_ask`, or `deny_unless_prior_grant`. Optional `reason` explains the decision to the agent/user; optional `permissionOverrides` contains resource grants. This gates tools, not model calls, and exposes no documented argument rewriting.

`PostToolUse` receives tool details, step index, and optional `error`; its documented output is `{}`. Full tool-result delivery is not established.

Relevant names include `run_command`, `view_file`, `invoke_subagent`, `define_subagent`, `send_message`, and `manage_subagents`. The hook page also lists legacy search tools removed from the default baseline in CLI `1.2.7`; match tools actually exposed by the selected agent. `invoke_subagent.Subagents` contains `Prompt`, `Role`, `TypeName`, and optional `Workspace`; a tool hook has no documented response field for prepending context to those arguments.

##### Stop Event

`Stop` input adds `executionNum`, `terminationReason`, optional `error`, and required `fullyIdle`. `decision: "continue"` prevents the pending stop and injects optional `reason` as a system message; other decisions allow stopping. `fullyIdle: false` means background work remains. **Stop is not a pre-model abort or final session-shutdown callback.** Exiting the hook process does not stop the conversation.

#### Execution Environment

On tested Linux CLI, workspace-plugin hooks run from the plugin directory through `sh -c` (`/usr/bin/dash`). `PWD` is also the plugin directory, not the project root. Normal `HOME` and launcher `PATH` are inherited; Node and globally installed Helper resolve. `ANTIGRAVITY_CONVERSATION_ID` matches input metadata.

`PLUGIN_ROOT`, `PLUGIN_DATA`, `CLAUDE_PLUGIN_ROOT`, and `AGY_PLUGIN_ROOT` were absent, including on `1.3.3`. Agent-side plugin data/bin facilities do not establish those facilities for shell hooks. Hook execution under `--sandbox` is verified, but restricted agent-tool access to Helper is not. Setup workflows separately require filesystem/command/registry access; do not add broad permission bypasses.

#### Conversation Identity

Resume retains `conversationId`; `/clear` creates a new UUID. `invocationNum` increments across tool continuations within an execution but resets on later user executions and idle-child wakeups. **Invocation zero is not a once-per-conversation guard.** `initialNumSteps` increases with retained history.

Each hook command is a fresh process. Persisted injection needs conversation-aware state for complete preamble bytes and handled checkpoints, with normal atomic-write/concurrency/privacy safeguards. `/add-dir` changes roots without changing UUID; do not reuse wrong-root bytes. Fork behavior is unverified, and turn-ending Stop does not establish safe final cache cleanup.

#### Workspace Identity

One `workspacePaths` entry identifies an unambiguous mounted root. Multiple entries do not designate a primary/launch root. On tested CLI `1.3.3`, arrays are lexically ordered rather than launch/addition ordered, including after interactive additions. **The first entry cannot identify the starting directory.** Sorting itself is observed, not a documented future-version guarantee.

CLI stream `init.cwd` exposes the starting directory to the caller, not to plugin hooks. Observed hook input lacks cwd; plugin cwd/`PWD` cannot substitute, and tested `OLDPWD`, `INIT_CWD`, and native root variables are absent. The TUI default project configuration contains ID/name, not a launch-root field. Transcript/artifact directories do not identify the project.

Native multi-folder rules are cumulative: each mounted root's `AGENTS.md` can contribute instructions. That is not an Operator multi-Brain policy. Do not silently select the first root, merge Brains, or render the plugin directory's Brain. Projects can contain multiple repositories, scratch configurations, or worktrees; worktree children require their actual checkout, not another checkout's Private Brain.

#### Failures and User Reporting

The native API exposes no documented PreInvocation abort field, `continue: false`, or generic `systemMessage` output. Tested nonzero exit, empty stdout, malformed JSON, and timeout do not block CLI model execution. Nonzero/malformed/timeout errors appear in diagnostic logs; CLI stderr and structured events do not automatically report them. Empty output produces no hook error. Graphical `2.12.0` release notes document native hook-error reporting while the conversation continues; that UI is untested here.

No standalone plugin toast, warning-banner, or status-widget API is documented. Tool-decision reasons accompany actual approval/denial; host terminal notifications serve questions/approvals, not arbitrary plugin warnings. Direct TUI rendering of injected messages and hook-origin question UI are unverified. Sending diagnostics to the model or asking it to relay them does not establish direct human notification.

Unexpected Helper execution failure and successful canonical load-diagnostic output are different: successful diagnostics remain complete payloads to inject, not errors to manufacture for the reporter. No fallback preamble should mask an execution failure. PostInvocation termination is not a substitute for pre-model blocking.

#### Verification Notes

- Runtime inspection captured allowlisted environment, hook metadata, shell executable/argv, and real Helper handoff with explicit fixture cwd/home. A sandboxed no-tool request executed the hook; it did not validate restricted workflow tools or authenticated installed-relative-runner execution.
- Resume/clear/tool-turn/wakeup checks established UUID/counter behavior; one child's sequence was `0, 1, 0, 1, 2` under one UUID. The initial fork attempt was consumed by a workspace-trust prompt and is not a verified fork.
- Four launch/add-order permutations among `a-added`, `m-launch`, and `z-added` always yielded that lexical path order. An interactive later-added folder also preceded the original root. A no-tool request received both mounted roots' `AGENTS.md` markers.
- CLI `1.3.1` failure cases used exit `23`, empty stdout, malformed JSON, and a two-second timeout; each allowed a successful model answer and exit `0`. Nonzero-exit behavior repeated on `1.3.3`. A requested user-message warning was relayed once; its ephemeral equivalent was not. Neither is proof of direct notification UI.
- Release-note fixes: `1.1.10` custom PostInvocation/Stop ordering; `1.2.3` plugin hooks in inspection; `1.2.4` hook retention under customization-budget truncation; `1.3.3` hook suppression for `/btw`.

#### Sources

- [Hooks](https://antigravity.google/docs/hooks), all native surface panels and event contracts.
- [Projects](https://antigravity.google/docs/projects), [Settings](https://antigravity.google/docs/settings), [Rules](https://antigravity.google/docs/rules), [Permissions](https://antigravity.google/docs/permissions), [Sandbox](https://antigravity.google/docs/sandbox).
- [Graphical changelog](https://antigravity.google/docs/changelog), `2.12.0`; [pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md).
