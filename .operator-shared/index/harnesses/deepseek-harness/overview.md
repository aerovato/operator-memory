---
description: DeepSeek Harness reference monorepo architecture and navigation to runtime, plugin, and distribution source maps
read_if: Preparing or implementing an Operator adapter for DeepSeek Harness, or navigating reference/deepseek-harness
---

# DeepSeek Harness

## Coverage

- `reference/deepseek-harness/` — Shallow clone of `deepseek-ai/deepseek-harness`.

## Architecture

- pnpm/TypeScript monorepo using vendored Cordis. Each capability is composed as a plugin with service injection, typed events, scoped registrations, and reversible effects; packages group service definitions, providers, and consumers.
- Named `dsh` profiles assemble bundles into a configurable plugin tree; the base tree supports different Web, headless, SDK, and ACP surfaces. Agent presets provide separate per-session composition.
- Agent-loop is a swappable plugin. It assembles prompts and tool schemas, commits model-visible inputs to a durable session log, and derives request history from that log. Extension points are divided among prompt assembly, agent events, tool execution, and direct human commands.
- Start with `docs/architecture.md` and `docs/cordis-primer.md`. Use the focused maps below for package-level navigation; this tree is too large for a single file-by-file index.

## `reference/deepseek-harness/` Index

- `AGENTS.md`, `CLAUDE.md` — Repository agent conventions; `CLAUDE.md` links to `AGENTS.md`.
- `README.md`, `README.zh.md`, `CONTRIBUTING.md`, `SAFETY.md`, `LICENSE` — Project entry, policies, and license.
- Root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*`, `vitest*`, lint and formatting configs — Ditto.
- `.agents/`, `.claude/`, `.github/` — Agent workflows, notes, and repository automation; large trees.

### `docs/` — Architecture, generated API reference, guides, and translations

- `architecture.md`, `cordis-primer.md`, `graph-atlas.md`, `module-graph.md` — Architectural entry points.
- `subsystems/` — Service/event documentation by capability; runtime and plugin entry points are mapped in the linked subindexes.
- `cookbook/`, `user/`, `cordis-tutorial/`, `cordis-api/` — Developer recipes, user guides, Cordis tutorials, and API reference; large trees.
- `i18n/`, `postmortem/`, `persistence-changes/`, `upgrade-guide/` — Localization, historical records, migrations, and compatibility guidance; large trees.
- Other root docs and generated catalogs — Supporting reference; search by subsystem when needed.

### `packages/` — Plugin workspace

- [`core/`, `context/`, `llm/`, `session/`, `compaction/`](runtime.md) — Agent loop, prompt assembly, model request, request context, and durable history.
- [`interaction/`, `hooks/`, `skill/`, `subagent/`, `extensions/`, `preset/`, `mcp/`](plugins.md) — Human commands, hook bridges, skills, delegation, dynamic plugins, presets, and MCP.
- [`boot/`, `bundle/`, `sdk/`, `host/`, `client/`, `api/`, `acp/`](distribution.md) — Profile composition, installation, application surfaces, and SDKs.
- `README.md`, `AGENTS.md` — Package-group directory and package authoring conventions.
- `attachment/`, `deliverables/`, `document/`, `spill/` — Attachments, file delivery, document conversion, and output spill; grouped by output handling.
- `browser-use/`, `computer-use/`, `fs/`, `lsp/`, `ptc-runtime/`, `shell/`, `ssh/`, `subprocess/`, `terminal/`, `web/` — Execution, workspace, remote access, and browsing capability families; group READMEs enumerate packages.
- `credentials/`, `identity/`, `sandbox/`, `settings/`, `storage/`, `workspace/` — Identity, trust, settings, and non-session storage families.
- `feedback/`, `goal/`, `guard/`, `jobs/`, `plan/`, `schedule/`, `todo/`, `webhook/`, `workflow/` — Coordination, human feedback, guardrails, automation, and workflow families.
- `experimental/` — Pre-stable feature prototypes and optional bundles; large group.
- `runtime-diagnostics/`, `session-query/`, `telemetry/`, `test-support/`, `typert/`, `util/` — Diagnostics, retrieval, instrumentation, test support, RPC type graphs, and shared utilities.

### Other root directories

- [`apps/`](distribution.md) — CLI, Web, and Electron applications.
- `python/`, `native/` — Python SDK/runtime and native system addon; large trees.
- `vendor/` — Vendored Cordis framework and pinned third-party components; large tree.
- `scripts/`, `benchmarks/`, `snapshots/`, `patches/`, `website/` — Gates, performance fixtures, recorded runs, dependency patches, and documentation site; large trees.
