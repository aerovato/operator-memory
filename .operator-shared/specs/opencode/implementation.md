# OpenCode V1 (Legacy) Adapter Implementation

Last Updated: October 20, 2026

Frozen binding of `@aerovato/operator-opencode` for existing OpenCode V1 installations. No further development or releases are planned. Runtime, tests, and Helper installation/recovery remain; OpenCode development guidance and source navigation are canonical under the [V2 guides](../../guides/opencode-v2/plugins.md) and [V2 reference index](../../index/harnesses/opencode-v2/monorepo.md).

## Package

The package remains `@aerovato/operator-opencode@latest`. Install or recover the last published version with:

```text
operator-helper install opencode-v1
```

## Preamble Injection

- Server plugin loads and renders through core, then caches the result per OpenCode `sessionID`
- Injects the cached text into model calls for that session (immutable for the session)
- On load failure, caches the diagnostic preamble and shows one recovery toast per affected session
- Subagents share the same session injection path and therefore the same preamble

## Commands

Registers missing OpenCode `config.command` entries for `operator:user-init`, `operator:project-init`, `operator:index`, and `operator:repair`. Existing user-defined commands, including commands with Operator names, remain authoritative.

Command orchestration and repair follow the shared [`commands.md`](../commands.md) contract.

## Status UI

Optional TUI plugin: home readiness indicator, sidebar partition status, per-project caching, and refresh after a top-level session becomes idle. The readiness indicator appends `(Local Build)` when loaded from a direct file or package-qualified local `file:` spec. Published installs append `(vX.Y.Z)` from OpenCode plugin meta when a version is present.

## Client Bridge

Bridges the V1 plugin client to the V2 SDK client where OpenCode still exposes the older surface to plugins.

## Differences From Reference

Pathway selections: bundled-core resolution, transform injection as a prepended synthetic user message, slash commands, optional status UI. One deviation:

1. Updates: V1 has no harness-native plugin update flow, so the adapter owns a stable cache wrapper and applies its own updates after restart instead of deferring to the harness.

The retained updater only operates inside the exact `@latest` wrapper and ignores pinned/local installations. Helper recovery clears that wrapper before forced global installation. Both bypass npm minimum-release-age restrictions with `NPM_CONFIG_MIN_RELEASE_AGE=0`; failed updates remove the wrapper for native reinstallation. This preserves existing recovery behavior, not an ongoing V1 release commitment.
