---
description: Claude Code adapter mod injection, command skills, API subset, tests, and build entrypoint
read_if: Working in packages/claude-code
---

# Claude Code Adapter

## Coverage

- `packages/claude-code/`

## Architecture

- Runtime injection uses Helper subprocess output; explicitly invoked skills hand setup and repair workflows to the agent.
- Bun builds the mod entrypoint into a self-contained ESM `hooks/register.js`.

## `packages/claude-code` Index

- `package.json`, `tsconfig.check.json`, `README.md` — Ditto
- `.claude-plugin/plugin.json` — Claude Code plugin manifest.
- `hooks/hooks.json` — Registers the built hooks module.
- `hooks/register.js` — Ignored generated mod bundle.
- `src/register.ts` — Compose and spawn injection with a shared render cache and launch-time version check.
- `src/types.ts` — Structural subset of the mod API consumed by the adapter.
- `test/register.test.ts` — Render caching, diagnostic passthrough, failure, subagent, and launch tests.
- `test/skills.test.ts` — Explicit skill invocation and Helper workflow instruction checks.
- `skills/user-init/SKILL.md`, `skills/project-init/SKILL.md`, `skills/index/SKILL.md`, `skills/repair/SKILL.md` — Agent-driven User, Project, Index, and memory-repair workflows.
