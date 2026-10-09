# OpenCode Adapter Implementation

Last Updated: October 2, 2026

How `@aerovato/operator-opencode` binds the general adapter contract for the deprecated OpenCode V1 platform. Command meaning and setup workflows stay in [`commands.md`](../commands.md) and [`../reference/implementation.md`](../reference/implementation.md). Behavioral deviations are recorded against the reference implementation; prefer the V2 adapter on current OpenCode.

## Package

Published as `@aerovato/operator-opencode`. Configured for OpenCode as `@aerovato/operator-opencode@latest` so install and update use one stable cache wrapper. Native update and recovery are adapter-owned; see Differences From Reference below.


Install and manual recovery:

```text
operator-helper install opencode
```

## Preamble Injection

- Server plugin loads and renders through core, then caches the result per OpenCode `sessionID`
- Injects the cached text into model calls for that session (immutable for the session)
- On load failure, caches the diagnostic preamble and shows one recovery toast per affected session
- Subagents share the same session injection path and therefore the same preamble

## Commands

Registers missing OpenCode `config.command` entries for `operator:user-init`, `operator:project-init`, `operator:index`, and `operator:repair`. Existing user-defined commands, including commands with Operator names, remain authoritative.

Each command template sends instructions in the current conversation without shell expansion. The agent checks Helper's version, upgrades when outdated, then runs the workflow operation and follows its output. Failed commands are repaired and retried by the agent, not reinvoked by the user. Operator does not switch sessions or invoke slash commands itself.

`operator:repair` runs `operator-helper memory check`. The agent may stop when no issues are detected; otherwise it repairs only reported issues without initializing uninitialized partitions, then follows the recovery workflow from [`../preamble.md`](../preamble.md).

## Status UI

Optional TUI plugin: home readiness indicator, sidebar partition status, per-project caching, and refresh after a top-level session becomes idle. The readiness indicator appends `(Local Build)` when loaded from a direct file or package-qualified local `file:` spec. Published installs append `(vX.Y.Z)` from OpenCode plugin meta when a version is present.

## Client Bridge

Bridges the V1 plugin client to the V2 SDK client where OpenCode still exposes the older surface to plugins.

## Differences From Reference

Pathway selections: bundled-core resolution, transform injection as a prepended synthetic user message, slash commands, optional status UI. One deviation:

1. Updates: V1 has no harness-native plugin update flow, so the adapter owns a stable cache wrapper and applies its own updates after restart instead of deferring to the harness.
