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

- `references/effect-smol/`

## Source checkout

- Upstream: https://github.com/Effect-TS/effect-smol.git
- Destination: `references/effect-smol/`
- Commit: `3a1128c7684e04d34d9f541f77adaac38a513056`
- Tracking branch: `main`

Clone only when needed, from the Operator repository root:

```sh
git clone --no-checkout --depth 1 --branch main https://github.com/Effect-TS/effect-smol.git references/effect-smol
git -C references/effect-smol fetch --depth 1 origin 3a1128c7684e04d34d9f541f77adaac38a513056
git -C references/effect-smol switch --detach 3a1128c7684e04d34d9f541f77adaac38a513056
```

## Architecture

- Mutable upstream Effect v4 reference checkout installed locally for shared Effect guide and implementation work.
- Its source, tests, platform packages, documentation, and workspace tooling are maintained upstream; consult the guide before using it.

## `references/effect-smol/` Index

- `packages/` - Effect runtime and platform package sources, tests, and examples.
- `ai-docs/`, `cookbooks/`, `migration/` - Usage, migration, and agent-oriented documentation.
- `scripts/`, `patches/`, `scratchpad/` - Upstream development support material.
- `.agents/`, `.changeset/`, `.github/`, `.patterns/`, `.specs/`, `.vscode/` - Upstream agent, release, automation, conventions, and editor configuration.
- `README.md`, `AGENTS.md`, `LLMS.md`, `MIGRATION.md` - Upstream project and agent-facing documentation.
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*.json`, `vitest*.ts` - Ditto.
