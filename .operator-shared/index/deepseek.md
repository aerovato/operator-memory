---
description: "@aerovato/operator-deepseek Host plugin, commands, tests, and installable DeepSeek Harness bundle"
read_if: Working in packages/deepseek or changing the DeepSeek Harness adapter
---

# DeepSeek Harness Adapter

## Coverage

- `packages/deepseek/`

## Architecture

- The published package is a Cordis Host and Web Client plugin plus a DeepSeek Harness bundle whose patch mounts it under a stable row id.
- The Host runtime lazily renders and caches one complete Core preamble per live agent, contributes it through the asynchronous system-prompt assembly hook, blocks prompt assembly after unexpected render failures, optionally registers the four Helper-backed Operator commands when DeepSeek supplies its interactive command service, and launches one detached Helper version check when activated.
- The package is an installable DeepSeek bundle whose stable patch row mounts the Host plugin in any compatible profile.

## `packages/deepseek/` Index

- `README.md` — Ditto.
- `package.json` — Published package, DeepSeek bundle metadata, compatibility peers, and build command.
- `cordis.patch.yml` — Bundle patch mounting the Operator Host plugin.
- `tsconfig.check.json` — Package check configuration.

### `src/`

- `index.ts` — Cordis Host plugin entrypoint, optional command binding, lazy Core preamble rendering, system-prompt assembly contribution, and detached Helper version check.
- `client.js` — Web Client composer-dock availability indicator, registered through the browser module loader.
- `client.css` — Composer-dock indicator styling aligned with the Harness's static statistics pills.
- `commands.ts` — Hyphenated Operator commands, canonical Helper sequencing and framing, cancellation, and agent handoff.

### `scripts/`

- `build.ts` — Bun ESM package build.

### `test/`

- `package.test.ts` — Host export, bundle mount, Client indicator registration, per-agent rendering, diagnostic, and failure checks.
- `commands.test.ts` — Command registration, Helper sequences, framing, unavailable behavior, and cancellation checks.
