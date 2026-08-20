---
description: "@aerovato/operator-helper source and template map"
read_if: Working in packages/helper or changing setup, status, guides, Git, or index lint
---

# Operator Helper Index

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `packages/helper/`

## Architecture

- `@aerovato/operator-helper` is the published Node-compatible installer and coordinator for harness adapters, deterministic Operator setup, memory checks, status, guides, Git integration, automatic updates, and Project Index linting.
- Services use a namespace containing `Interface`, `Service`, and `layer`; service identifiers follow `@aerovato/operator-helper/<service-name>`.

## `packages/helper/` Index

- `README.md` — Published npm landing page with installation, command summary, side effects, and documentation links
- `tsconfig.check.json` — Package-scoped source typecheck configuration

### `packages/helper/scripts/`

- `build.ts` — Clean bundled Node CLI build with external source map and bundled Code Puppy adapter asset

### `packages/helper/src/`

- `index.ts` — Effect Node runtime entrypoint, production layers, process context capture, output, and exit status
- `cli.ts` — Injectable CLI Effect with subcommand validation, descriptive help, failure rendering, and operational-command routing
- `npm-registry.ts` — Small npm registry service for resolving concrete latest package versions
- `output.ts` — Shared borderless plaintext table rendering
- `filesystem.ts` — Effect filesystem operations, private-directory enforcement, symlink-safe listing, and typed failures
- `git.ts` — Effect child-process based global ignore configuration and tracked Private file detection
- `lint.ts` — Effect Path/FileSystem recursive Project Index checks and safe structured lint findings
- `templates.ts` — Typed in-package template registry used by init and guide commands
- `utils.ts` — CLI context, output result, formatting, and generic utilities

#### `packages/helper/src/templates/`

- `user/operator.ts` — User Operator Instructions seed variable
- `user/setup.ts` — User Instructions setup guide variable
- `project/operator.ts` — Private or Shared Operator Instructions seed variable
- `project/setup.ts` — Project Brain setup guide variable
- `project/index-setup.ts` — Project Index setup and refresh guide variable
- `project/shared-readme.ts` — Introductory Project Shared README variable

### `packages/helper/test/`

- `cli.test.ts` — Temporary-filesystem command routing, memory check, guide, status, initialization, and lint integration coverage
- `install-update.test.ts` — OpenCode and managed Code Puppy installation plus Bun/npm automatic update, release-age override, channel fallback, and failure coverage
- `npm-registry.test.ts` — Latest-version response decoding and typed registry failure coverage
- `filesystem.test.ts` — Live temporary-filesystem path and symlink inspection, text I/O, non-overwriting writes, and recursive listing coverage
- `git.test.ts` — Configured and fallback global ignore plus tracked Private file coverage
- `lint.test.ts` — Recursive checks and independent main-index title enforcement coverage
- `templates.test.ts` — Embedded template reads and setup-guide seed coverage
- `output.test.ts` — Borderless plaintext table rendering coverage
- `utils.test.ts` — Error, comparison, record, and CLI failure utility coverage
- `mocks/git-runner.ts` — Minimal reusable `GitRunner` service layer factory

#### `packages/helper/src/commands/`

- `common.ts` — Shared typed filesystem failure rendering at the CLI boundary
##### `commands/install/`

- `opencode.ts` — OpenCode CLI installation and stable-cache recovery
- `code-puppy.ts` — Marked, atomic Code Puppy user-plugin installation and update
- `preamble.ts` — Canonical core-backed preamble rendering for harness adapters
- `update.ts` — Cached per-invocation version checks, installation-channel detection, silent exact-version update, and timeout behavior

##### `commands/memory/`

- `check.ts` — Full concurrent partition load validation, diagnostics, and exit-code policy

##### `commands/user/`

- `common.ts` — Shared User Instructions display path
- `status.ts` — User Instructions presence and size status
- `init.ts` — User Instructions non-overwriting initialization from the in-package seed
- `guide.ts` — User Setup guide output with embedded seed

##### `commands/project/`

- `common.ts` — Shared project partition roots and core file paths
- `status.ts` — Project partition, non-index freeform content, Git ignore, and tracking status
- `init.ts` — Private initialization from in-package templates, existing-Shared README seeding and inspection, and Git ignore configuration
- `guide.ts` — Project Setup guide output with embedded seeds

##### `commands/index/`

- `status.ts` — Private and Shared main Project Index presence status
- `lint.ts` — Structured lint finding rendering and exit-code policy
- `guide.ts` — Project Index guide output
