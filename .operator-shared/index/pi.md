---
description: "@aerovato/operator-pi source map"
read_if: Working in packages/pi or changing Pi extension behavior
---

# Operator Pi Index

## Coverage

- `packages/pi/`

## Architecture

- `@aerovato/operator-pi` is the published Pi extension adapter. Pi owns extension discovery and supplies its runtime peer packages; the adapter bundle owns Operator core.

## `packages/pi/` Index

- `README.md` - Published npm landing page with installation, runtime behavior, commands, status, and native updates.
- `package.json`, `tsconfig.check.json` - Ditto.

### `packages/pi/src/`

- `index.ts` - Factory-local preamble injection, recovery and fatal handling, and Pi footer lifecycle.
- `commands.ts` - Native Operator command registration and agent instruction delivery.

### `packages/pi/test/`

- `commands.test.ts` - Four instruction-based commands, prompt handoff, and collision coverage.
- `index.test.ts` - Preamble, failure, session reset, and footer lifecycle coverage.

### `packages/pi/scripts/`

- `build.ts` - Clean single-entry JavaScript bundle build with Pi runtime packages externalized.
