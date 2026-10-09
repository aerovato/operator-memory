---
description: OpenCode reference monorepo package map
read_if: Navigating reference/opencode-v1 packages or choosing a focused OpenCode subindex
---

# OpenCode Monorepo Index

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `reference/opencode-v1/`

## Architecture

- OpenCode monorepo: TypeScript/Bun + Turborepo. All packages nested under `reference/opencode-v1/packages/`.

## `reference/opencode-v1/` Index

### Subindexes

- [`opencode.md`](opencode.md) — Main application: CLI, server, sessions, agents, tools, LLM, MCP, permissions
- [`core.md`](core.md) — Shared core library: filesystem, logging, observability, database, session/agent/tool/plugin services, utilities
- [`plugin.md`](plugin.md) — Plugin development: types, V2 plugin system, SDK (V1 + V2), hooks, tool system, examples

### `packages/` Index

#### Core/Backend Packages (indexed)

- `packages/core` — Shared core library (see [`core.md`](core.md))
- `packages/opencode` — Main application (see [`opencode.md`](opencode.md))
- `packages/plugin` — Plugin type definitions, V1 + V2 plugin system (see [`plugin.md`](plugin.md))
- `packages/sdk` — Generated JavaScript SDK client, V1 + V2 APIs (see [`plugin.md`](plugin.md))
- `packages/server` — HTTP API server implementation using Effect HttpApi
- `packages/protocol` — Protocol definitions shared between server and clients
- `packages/schema` — Shared schema definitions (Drizzle, Zod/Effect)
- `packages/client` — Generated client library (HTTP API types and fetch layer)
- `packages/sdk-next` — Next-gen SDK composing Client, Core, and Server
- `packages/llm` — Native LLM client library (`@opencode-ai/llm`) for direct model communication
- `packages/tui` — Terminal UI application (`@opencode-ai/tui`); slash commands, routes, components
- `packages/cli` — CLI entry point package
- `packages/session-ui` — Web-focused React component library for rendering sessions (markdown, diffs, tool cards)

#### Infrastructure Packages

- `packages/effect-drizzle-sqlite` — Effect integration for Drizzle ORM with SQLite
- `packages/effect-sqlite-node` — Effect SQLite driver for Node.js
- `packages/database` — Database abstraction (within core: see [`core.md`](core.md))
- `packages/http-recorder` — HTTP request recording for testing
- `packages/httpapi-codegen` — HTTP API code generation tooling
- `packages/codemode` — Code mode orchestration runtime

#### Console Packages (not plugin-relevant)

- `packages/console/core` — Console backend: Drizzle schema, domain modules
- `packages/console/function` — Console edge functions
- `packages/console/app` — Console web application
- `packages/console/mail` — Email templates
- `packages/console/resource` — Infrastructure resources

#### UI Packages (not indexed)

- `packages/app` — Web application
- `packages/desktop` — Electron desktop app
- `packages/enterprise` — Enterprise web app
- `packages/ui` — Shared UI component library
- `packages/docs` — Documentation site
- `packages/storybook` — Component storybook
- `packages/web` — Marketing website

#### Other Packages

- `packages/slack` — Slack bot: bridges Slack threads to OpenCode sessions
- `packages/function` — Cloudflare Worker: session sync via Durable Objects, GitHub token exchange
- `packages/script` — Build/release utilities: version resolution, channel detection
- `packages/containers` — Container build definitions
- `packages/stats` — Usage statistics collection
- `packages/identity` — Brand assets

### Other Directories

- `sdks/vscode/` — VS Code extension SDK
- `github/` — GitHub integration (issues, PRs)
- `infra/` — Infrastructure configuration
- `specs/` — Specifications and design docs
- `script/` — Root-level scripts
- `install/` — Installation scripts
- `patches/` — Package patches
- `nix/` — Nix flake configuration
- `perf/` — Performance benchmarks
- `artifacts/` — Build artifacts
