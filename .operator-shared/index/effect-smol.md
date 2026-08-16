---
description: Git-ignored Effect v4 reference source tree map
read_if: Verifying Effect v4 APIs, examples, testing patterns, or source conventions
---

# Effect-Smol Reference Index

## Guidelines

- Index all files and directories covered by this index.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `.operator-shared/references/effect-smol/`

## Architecture

- Mutable upstream Effect v4 reference checkout installed locally for shared Effect guide and implementation work.
- Its source, tests, platform packages, documentation, and workspace tooling are maintained upstream; consult the guide before using it.

## `.operator-shared/references/effect-smol/` Index

- `packages/` - Effect runtime and platform package sources, tests, and examples.
- `ai-docs/`, `cookbooks/`, `migration/` - Usage, migration, and agent-oriented documentation.
- `scripts/`, `patches/`, `scratchpad/` - Upstream development support material.
- `.agents/`, `.changeset/`, `.github/`, `.patterns/`, `.specs/`, `.vscode/` - Upstream agent, release, automation, conventions, and editor configuration.
- `README.md`, `AGENTS.md`, `LLMS.md`, `MIGRATION.md` - Upstream project and agent-facing documentation.
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*.json`, `vitest*.ts` - Ditto.
