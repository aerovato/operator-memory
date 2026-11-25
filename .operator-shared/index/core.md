---
description: "@aerovato/operator-core source map"
read_if: Working in packages/core or changing memory loading and preamble rendering
---

# Operator Core Index

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `packages/core/`

## Architecture

- `@aerovato/operator-core` is the private, harness-agnostic runtime package. It reads Operator memory concurrently with portable Node APIs and returns independent typed partition results for harness adapters and preamble rendering.

## `packages/core/` Index

- `tsconfig.check.json` - Package-scoped source typecheck configuration

### `packages/core/src/memory/`

Read-only memory module with no barrel export.

- `common.ts` — Memory-specific filesystem reads, content-free readable-file checks, and load error
- `frontmatter.ts` — Project Index frontmatter types and non-throwing parser enforcing non-empty required metadata
- `project.ts` — Project partition structural status/full loading and recursive index discovery
- `user.ts` — User partition structural status/full loading
- `load.ts` — Concurrent overloaded status-only or full per-partition snapshot orchestration, including settings
- `load.test.ts` — Memfs-backed status, empty, complete, malformed-frontmatter, ordering, and independent obstruction coverage

### `packages/core/src/`

- `settings.ts` — Settings schema, `defaultSettings`, and `~/.operator/settings.json` loading with silent repair of unknown or invalid keys
- `settings.test.ts` — Memfs-backed missing, sparse, valid, repaired, rewritten, and unparseable settings coverage
- `preamble.ts` — Renderer for v2.0 and v2.1 guidance, all-or-nothing memory injection, recovery diagnostics, and setup and settings warnings
- `preamble.test.ts` — Guidance, memory injection, recovery diagnostic, index formatting, warning, settings, and deterministic rendering coverage
- `preamble-rollout.ts`, `preamble-rollout.test.ts` — Infrastructure for A/B testing preambles: version selection (settings override, then a 20 percent v2.1 split), stable percentage assignment, OS identity reads, and fallback coverage
- `utils.ts` — Generic result, type-guard, and error utilities shared across core modules

#### `packages/core/src/prompts/`

- `preamble-v2.ts` — v2.0 Operator guidance and tenets; embeds core document templates
- `preamble-v2-1.ts` — v2.1 candidate guidance and tenets for the active rollout; differs from v2.0 only in Project Index wording

#### `packages/core/src/templates/`

- `project-index.ts` — Main Project Index document syntax template
- `project-subindex.ts` — Project Index subindex document syntax template
- `catalog.ts` — Project / User Catalog document syntax template
