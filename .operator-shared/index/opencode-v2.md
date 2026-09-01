---
description: "@aerovato/operator-opencode-v2 source map"
read_if: Working in packages/opencode-v2 or changing OpenCode V2 preamble injection
---

# Operator OpenCode V2 Index

## Coverage

- `packages/opencode-v2/`

## Architecture

- `@aerovato/operator-opencode-v2` uses V2's Promise plugin API, injects one immutable rendered preamble per session through the model-boundary context hook, registers Operator commands through command transforms, updates its validated V2 cache installation, and provides RPC-backed readiness, partition status, refresh, and notification TUI parity.

## `packages/opencode-v2/` Index

- `package.json`, `tsconfig.check.json` — Ditto
- `README.md` — V2 package purpose, installation, core behavior, and V1 separation

### `packages/opencode-v2/src/`

- `index.ts` — V2 plugin definition, context-hook preamble injection, command wiring, and detached Helper update trigger
- `commands.ts` — V2 command transforms, Helper execution, XML output framing, and prompt admission
- `notifications.ts` — Typed server-to-TUI status method and notification event contract
- `preamble.ts` — Core-backed immutable per-session preamble loading and caching
- `tui.tsx` — RPC status client, connecting/readiness and partition UI, idle refresh, and notification listener
- `update.ts` — V2 generational-cache validation, native package update, and recovery
- `utils.ts` — Generic result type and constructors

### `packages/opencode-v2/test/`

- `index.test.ts` — Plugin setup, command registration, update trigger, and context injection coverage
- `commands.test.ts` — User-command preservation, ordered Helper execution, output framing, and prompt admission coverage
- `preamble.test.ts` — Session immutability coverage
- `tui.test.ts` — Status display, slot registration, toasts, and idle refresh coverage
- `update.test.ts` — Cache validation, version comparison, update, and recovery coverage

### `packages/opencode-v2/scripts/`

- `build.ts` — Clean server JavaScript bundle build
