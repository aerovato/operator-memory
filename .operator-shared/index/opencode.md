---
description: "@aerovato/operator-opencode source map"
read_if: Working in packages/opencode or changing OpenCode preamble injection
---

# Operator OpenCode Index

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `packages/opencode/`

## Architecture

- `@aerovato/operator-opencode` is the published OpenCode adapter. Its server entry injects one immutable rendered Operator preamble into every model call for each session, its TUI entry renders readiness and partition status, and it refreshes its stable `@latest` OpenCode cache installation in the background.

## `packages/opencode/` Index

- `README.md` — Published npm landing page with Helper-managed installation, OpenCode commands, session guidance, and documentation links
- `tsconfig.check.json` — Package-scoped source, test, and build-script typecheck configuration

### `packages/opencode/src/`

- `index.ts` — OpenCode plugin entrypoint, hook wiring, fatal error handling, and deduplicated recovery notices
- `tui.tsx` — Installation-aware home readiness indicator, sidebar partition status, per-project caching, and completed-turn refresh
- `tui.test.ts` — TUI slot registration and completed-turn refresh coverage
- `client.ts` — V1 plugin-client to V2 SDK client bridge
- `commands.ts` — Non-overwriting inline setup and memory-repair command registration
- `commands.test.ts` — Command sequencing, user-command preservation, configuration, and repair-instruction coverage
- `preamble.ts` — Result-bearing preamble loading, rendering, and immutable normal or diagnostic per-session caching
- `preamble.test.ts` — Normal and recovery-diagnostic session immutability coverage
- `update.ts` — Nonblocking npm version check and direct stable `@latest` wrapper update with restart notification
- `update.test.ts` — Wrapper validation, semantic-version comparison, update, and no-op coverage
- `utils.ts` — Generic result type and success/failure constructors

### `packages/opencode/scripts/`

- `build.ts` — Clean server and TUI JavaScript bundle build
