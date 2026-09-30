---
description: @aerovato/operator-deepseek package and DeepSeek Harness bundle scaffold
read_if: Working in packages/deepseek or changing the DeepSeek Harness adapter
---

# DeepSeek Harness Adapter

## Coverage

- `packages/deepseek/`

## Architecture

- The published package is both a Cordis Host plugin and a DeepSeek Harness bundle whose patch mounts that plugin under a stable row id.
- The Host runtime owns DeepSeek-specific lifecycle behavior and launches one detached Helper version check when activated.

## `packages/deepseek/` Index

- `package.json` — Published package, DeepSeek bundle metadata, compatibility peers, and build command.
- `cordis.patch.yml` — Bundle patch mounting the Operator Host plugin.
- `tsconfig.check.json` — Package check configuration.

### `src/`

- `index.ts` — Cordis Host plugin entrypoint and detached Helper version check.

### `scripts/`

- `build.ts` — Bun ESM package build.

### `test/`

- `package.test.ts` — Host export and bundle mount checks.
