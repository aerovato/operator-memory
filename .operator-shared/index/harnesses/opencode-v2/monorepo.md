---
description: OpenCode v2 stable reference monorepo package map
read_if: Navigating reference/opencode-v2 packages or choosing a focused OpenCode v2 subindex
---

# OpenCode V2 Monorepo Index

## Coverage

- `reference/opencode-v2/` (branch `v2`, single-branch clone)

## Architecture

- OpenCode V2 stable monorepo (2.0.18 at last pull): TypeScript/Bun + Turborepo. Packages live under `reference/opencode-v2/packages/` and services under `reference/opencode-v2/services/`.
- V2 is a substantial re-architecture of V1: the old `packages/opencode` main app is split into `core` (runtime services), `server` (HTTP API), `cli`, and `tui`. Session execution, plugins, and permissions moved into `packages/core/src`.
- V2 has separate SDKs and APIs; V1 SDK versions (in `reference/opencode-v1`) have no relation to OpenCode V2.
- `specs/v2/` holds authoritative V2 cross-module contracts; protocol endpoint definitions assembled by Server `HttpApi` own HTTP operations, `schema` owns public domain shapes.

## `reference/opencode-v2/` Index

### Subindexes

- [`core.md`](core.md) — Core runtime: session execution, plugins, tools, permissions, config, database, Effect infrastructure
- [`plugin.md`](plugin.md) — Plugin package (Effect + Promise versions), SDK in-process host, and client libraries

### `packages/` Index

#### Core/Backend Packages (indexed)

- `packages/core` — Shared runtime library (see [`core.md`](core.md))
- `packages/plugin` — Plugin type definitions, Effect and Promise versions (see [`plugin.md`](plugin.md))
- `packages/sdk` — In-process OpenCode host for Promise and Effect applications (see [`plugin.md`](plugin.md))
- `packages/client` — Client library: contract, RPC runtime, shared events, Solid and Effect bindings
- `packages/protocol` — OpenAPI/HTTP endpoint protocol definitions shared by server and clients
- `packages/server` — HTTP API server: routes, handlers, middleware, event feed, auth, CORS
- `packages/schema` — Shared public domain and durable event schemas
- `packages/cli` — CLI entry point: acp, commands, config, run, mini host, node framework
- `packages/tui` — Terminal UI application: components, context, feature-plugins, mini mode, config
- `packages/session-ui` — Session rendering UI components
- `packages/ai` — AI/model integration package
- `packages/codemode` — Code mode orchestration runtime
- `packages/identity` — Identity/account package
- `packages/plugin-browser` — Browser plugin package
- `packages/function` — Cloudflare Worker functions
- `packages/util` — Shared utilities
- `packages/theme` — Theme definitions
- `packages/effect-drizzle-sqlite` — Effect integration for Drizzle ORM with SQLite
- `packages/http-recorder` — HTTP request recording for testing
- `packages/httpapi-codegen` — HTTP API code generation tooling
- `packages/script` — Build/release utilities

#### App/UI Packages (not indexed)

- `packages/app` — Web application (Solid-based)
- `packages/desktop` — Desktop application
- `packages/console/` — Console backend, app, mail, resources
- `packages/stats/` — Usage statistics apps
- `packages/web`, `packages/posts` — Web properties and content
- `packages/ui` — Shared UI component library
- `packages/storybook` — Component storybook
- `packages/enterprise` — Enterprise web app
- `packages/merman`, `packages/latex`, `packages/simulation`, `packages/containers` — Niche utilities

### Other Directories

- `services/www/src/docs/content/` — V2 documentation source, including plugin and migration guides
- `services/update/`, `services/files/` — Update and file services
- `specs/v2/` — V2 specifications: session, tools, event-stream architecture, provider policy, plugin lifecycle, catalog config
- `sdks/vscode/` — VS Code extension
- `github/` — GitHub integration
- `infra/` — Infrastructure configuration
- `script/` — Root-level scripts (ast-grep lint rules, profiling, version tooling)
- `install/` — Installation scripts
- `patches/` — Package patches
- `nix/`, `perf/`, `artifacts/` — Nix flake, benchmarks, build artifacts
