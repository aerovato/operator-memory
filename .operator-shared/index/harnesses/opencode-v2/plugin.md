---
description: OpenCode v2 plugin package, SDK host, and client development reference
read_if: Researching OpenCode v2 plugin domains, hooks, in-process SDK hosting, or client bindings
---

# OpenCode V2 Plugin and SDK Reference

## Coverage

- `reference/opencode-v2/packages/plugin/`
- `reference/opencode-v2/packages/sdk/`
- `reference/opencode-v2/packages/client/` (plugin-relevant parts)

## Architecture

- V2 plugin package `@opencode/plugin` has two parallel versions: Effect and Promise. Every Effect domain extends the corresponding API client interface from `@opencode/client/effect/api` and adds only plugin-context functions; never redefine client interface functions.
- V2 SDKs are separate from V1 SDK versions; `@opencode/sdk` runs the assembled Server HTTP router in memory (no listener, no network hop) with Promise and Effect APIs plus a Workerd entrypoint for Cloudflare Durable Objects.
- Plugin lifecycle contract lives in `reference/opencode-v2/specs/v2/catalog-config-plugin-lifecycle.md`.

## `reference/opencode-v2/packages/plugin/` Index

### `src/`

- `app.ts` — Plugin application entry
- `options.ts` — Plugin options
- `rpc.ts`, `storage.ts`, `source*.ts`, `host.ts` — RPC/storage surfaces, package resolution, and loader
- `effect/`, `promise/` — Parallel plugin domains for agent, provider, model, command, RPC, session, tools, and other contexts
- `tui/` — TUI plugin surface: `context.ts`, `plugin.ts`, `solid.ts`

## `reference/opencode-v2/packages/sdk/` Index

### `src/`

- `opencode.ts` — `OpenCode` in-process host (`OpenCode.create()`, session and plugin registration, disposal)
- `contracts.ts` — SDK contract types
- `tool.ts`, `promise.ts` — Tool and Promise API surfaces
- `effect/` — Effect API bindings: `index.ts`, `opencode.ts`, `tool.ts`
- `workerd.ts` — Workerd entrypoint (`OpenCodeWorkerd`) for Durable Objects
- `internal/` — `fetch.ts`, `host.ts`, `workerd.ts` internals
- `logging.ts` — Structured logging options

## Related

- `packages/client/` — `@opencode/client`: contract, RPC runtime, shared events, `effect/` and `solid/` bindings; plugin Effect domains extend its API client interfaces
