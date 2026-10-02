---
description: Claude Code adapter mod injection, API subset, tests, and build entrypoint
read_if: Working in packages/claude-code
---

# Claude Code Adapter

## Coverage

- `packages/claude-code/`

## Architecture

- Runtime injection uses Helper subprocess output; skills are not implemented yet.
- Bun builds the mod entrypoint into a self-contained ESM `hooks/register.js`.

## `packages/claude-code` Index

- `package.json`, `tsconfig.check.json`, `README.md` — Ditto
- `.claude-plugin/plugin.json` — Claude Code plugin manifest.
- `hooks/hooks.json` — Registers the built hooks module.
- `hooks/register.js` — Ignored generated mod bundle.
- `src/register.ts` — Compose and spawn injection with a shared render cache and launch-time version check.
- `src/types.ts` — Structural subset of the mod API consumed by the adapter.
- `test/register.test.ts` — Render caching, diagnostic passthrough, failure, subagent, and launch tests.
