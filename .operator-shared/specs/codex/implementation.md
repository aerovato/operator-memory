# Codex Adapter

Last Updated: October 2, 2026

Codex CLI and Codex Desktop use the dependency-free `@aerovato/operator-codex` legacy plugin package. Shared memory rendering remains in Helper; the adapter only binds Codex lifecycle events to `operator-helper preamble`. Behavioral deviations are recorded against [`../reference/implementation.md`](../reference/implementation.md), not other bindings.

## Preamble Injection

- `SessionStart` injects current memory for `startup`, `clear`, and `compact` sources.
- `resume` and `fork` skip reinjection because their retained history already contains the prior preamble.
- `SubagentStart` injects current memory for delegated `ThreadSpawn` subagents. Codex does not expose start hooks for internal workers.
- Every render runs Helper with the event `cwd` and passes successful stdout to Codex unchanged with no context-output limit.
- The adapter keeps no cache.

Codex is an explicit exception to the generic immutable-preamble contract. Codex cannot consistently restore context at the beginning after compaction or place the main thread's exact injected message at the beginning of a delegated thread. Compaction and delegated subagents therefore render current memory again and persist it as lifecycle-hook developer context.

## Failure

If Helper cannot render a non-empty preamble, the hook emits a concise `systemMessage`. It also requests `continue: false`; Codex honors this for `SessionStart` but cannot block `SubagentStart`.

## Commands

Codex plugins cannot register arbitrary slash commands. The adapter exposes the four Operator workflows as explicitly invoked plugin skills: `$operator-user-init`, `$operator-project-init`, `$operator-index`, and `$operator-repair`. They may also be selected through Codex's skills picker. Implicit invocation is disabled. Codex requires each skill name to match its folder name, and colons are invalid in Windows folder names, so these skill names use hyphens rather than the canonical command namespace.

Each skill directs the agent to check Helper's version, upgrade when outdated, then run the corresponding workflow operation. If Helper cannot start, the agent repairs it and retries the failed command; non-zero setup results supply their guide and failure details, and memory checks supply repair findings. Helper output is working context for the agent and is not reproduced for the user. Skills do not duplicate Helper filesystem, Git, status, guide, lint, installation, or repair logic.

## Installation

`operator-helper install codex` owns a stable local marketplace that resolves the latest npm release, installs or refreshes the plugin as `aerovato@operator-memory`, and verifies that it is installed and enabled. When the Codex CLI is unavailable, Helper instead upserts only its own `[marketplaces.operator-memory]` table in `config.toml` (`CODEX_HOME`, default `~/.codex`) — the same table the CLI writes — and instructs the user to install the plugin from the Codex plugins browser; no verification is claimed for that handoff. Helper refuses to edit a `config.toml` that expresses `marketplaces` without tables. Helper does not write Codex hook trust. Codex's native startup review handles untrusted or modified hooks, and installation requires a fresh session before plugin capabilities become active.

## Differences From Reference

Pathway selections: Helper-subprocess resolution, persisted-context injection, skills for commands, no status UI. All are accepted reference pathways except:

1. Hook trust: Codex skips plugin hooks until the user approves them through native startup review. Until trust is granted, preamble injection silently does not run; Helper never writes trust state. No other binding has an equivalent gate.
2. Failure blocking: `continue: false` blocks a failed `SessionStart`, but Codex cannot block `SubagentStart`, so a failed subagent render proceeds without Operator memory and surfaces a `systemMessage`. The reference requires blocking wherever the harness allows it.
3. Updates: reference prefers harness-native update flows; Codex has none for marketplace plugins, so updates require rerunning `operator-helper install codex` and a fresh session.
