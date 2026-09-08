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

- `package.json`, `tsconfig.check.json` - Ditto.

### `packages/pi/src/`

- `index.ts` - Factory-local immutable preamble rendering, context injection, recovery notices, and fatal abort handling.

### `packages/pi/test/`

- `index.test.ts` - Render coalescing, stable message, load diagnostic, fatal abort, and session reset coverage.

### `packages/pi/scripts/`

- `build.ts` - Clean single-entry JavaScript bundle build with Pi runtime packages externalized.
