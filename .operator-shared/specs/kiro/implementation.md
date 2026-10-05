# Kiro Adapter Implementation

Last Updated: October 5, 2026

How Operator binds the [reference adapter implementation](../reference/implementation.md) to Kiro IDE and CLI V3. The adapter is distributed through Helper as hook, steering, and skill files; there is no separate Kiro package. Core owns memory loading and rendering through Helper. Command meaning and setup workflows stay in [Commands](../commands.md).

## Preamble Resolution

The adapter uses the accepted Helper-subprocess pathway. `operator-helper preamble` renders memory for the active workspace. Successful output is the complete normal preamble or the canonical all-or-nothing diagnostic preamble and is used unchanged. A rendered memory-load diagnostic is not a command execution failure.

## Preamble Injection

A global `SessionStart` command hook runs `operator-helper preamble` from the workspace root. Kiro adds successful stdout to the main agent's context. The adapter keeps no render cache and does not install an outgoing model-boundary transform.

Main-agent loading uses lifecycle-hook context injection. Subagents load the preamble through the steering instructions below.

## Steering and Subagents

Always-included steering is required alongside the hook. It supplies this exact prompt, with `inclusion: always` frontmatter:

```markdown
# Operator Memory

Operator Memory is installed for Kiro. If you do not see Operator's preamble guidance above wrapped within `<operator-guidance>`, manually run the `operator-helper preamble` command once from the workspace root and follow all instructions from the command output. If the command fails, report to the user and stop. Do not run if the preamble is already available.
```

Built-in subagents inherit steering but do not receive the parent's hook-injected preamble. Kiro has no subagent start hook. Subagents follow the inherited instructions and run Helper themselves; this is agent-driven loading. The same instructions cover a main agent whose preamble is missing.

Operator uses general Kiro mechanisms. It does not install custom agents or require users to select one.

## Failure Semantics

Successful Helper output, including a canonical diagnostic preamble, is followed unchanged.

A non-zero `SessionStart` command shows a warning to the user. Kiro proceeds with the session; the failed hook's error output is not injected into the agent's context. An agent missing the preamble follows the steering instructions to load it manually. If that Helper command fails, the agent reports the failure and stops.

## Commands

Four explicitly invoked skills expose the Operator workflows:

- `/operator-user-init`
- `/operator-project-init`
- `/operator-index`
- `/operator-repair`

Each supplies the reference command instructions: check Helper's version, upgrade when outdated, run the corresponding workflow operation, and handle failures directly. The agent executes Helper in the current conversation. Skill descriptions restrict use to explicit user invocation; hyphenated names are the Kiro-compatible command names.

Helper output remains agent working context. Skills do not duplicate Helper's setup, filesystem, Git, validation, or repair logic.

## Installation and Updates

`operator-helper install kiro` is available from Helper `1.8.0`, requires Helper on `PATH`, and installs one hook, one always-included steering file, and four skill entry files under ordinary `$HOME/.kiro/`.

These six files are plugin-owned. Installation and reinstallation overwrite them intentionally; user modifications are at the user's risk. No edit-preservation or disabled-hook-preservation policy is required.

Installation ignores `KIRO_HOME`. CLI binary `2.27.1`, running the V3 engine (`--v3`) with KAS `0.66.22`, ignores that override for global hooks, steering, and skills and discovers them under ordinary `$HOME/.kiro/`. Do not install duplicate copies into both directories.

Helper releases distribute adapter updates. Rerun `operator-helper install kiro` to refresh the files and start a new Kiro session to load them. There is no adapter status UI.

## Differences From Reference

Accepted pathway selections: Helper-subprocess resolution, lifecycle-hook context injection, explicitly invoked skills with hyphenated names, no status UI, and Helper-managed installation and updates.

Behavioral differences:

- Subagent loading is agent-driven through inherited steering, rather than automatic lifecycle injection. It depends on the agent following the instructions and being able to execute Helper. Each manual invocation renders memory for that workspace at invocation time.
- Unexpected startup-hook execution failures cannot block the session. Kiro warns the user and proceeds; steering instructs the agent to stop if manual loading also fails. The reference permits visible failure where harness-level blocking is impossible.

## Verification

Helper tests cover installed hook configuration, the exact approved steering prompt and frontmatter, all four skills, replacement of a stale plugin file, repeat installation, and the Helper-on-`PATH` prerequisite. `bun run check packages/helper` validates the package.

Runtime experiments verified main-agent hook injection, inherited steering in built-in subagents, absence of parent hook output in those subagents, full skill-body activation, and ordinary-home discovery despite `KIRO_HOME`. CLI sessions explicitly selected `--v3` and confirmed `engine: "v3"`; the CLI binary's `2.27.1` version is not the selected engine version.

Detailed verification of Kiro V3 injection behavior lives in [the injection verification guide](../../guides/kiro/injection.md). Harness API guidance lives in [the Kiro guides](../../guides/kiro/overview.md).
