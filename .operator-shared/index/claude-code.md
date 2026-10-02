---
description: Claude Code adapter package scaffolding and build entrypoint
read_if: Working in packages/claude-code
---

# Claude Code Adapter

## Coverage

- `packages/claude-code/`

## Architecture

- Package scaffolding only; runtime injection and skills are not implemented yet.
- Bun builds the mod entrypoint into a self-contained ESM `hooks/register.js`.

## `packages/claude-code` Index

- `package.json`, `tsconfig.check.json`, `README.md` — Ditto
- `.claude-plugin/plugin.json` — Claude Code plugin manifest.
- `hooks/hooks.json` — Registers the built hooks module.
- `hooks/register.js` — Ignored generated mod bundle.
- `src/register.ts` — Mod registration scaffold.
- `test/register.test.ts` — Scaffold registration smoke test.
