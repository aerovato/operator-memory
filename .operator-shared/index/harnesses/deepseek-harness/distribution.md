---
description: DeepSeek Harness profile, bundle, plugin installation, CLI, Web UI, and SDK source map
read_if: Packaging, installing, updating, composing, previewing, or testing a DeepSeek Harness Operator plugin
---

# DeepSeek Harness Distribution

## Coverage

- `reference/deepseek-harness/packages/boot/`, `packages/bundle/`, `packages/sdk/`, `packages/host/`, `packages/client/`, `packages/acp/`, `packages/api/`
- `reference/deepseek-harness/apps/`, `python/`, and focused profile documentation

## Architecture

- `dsh` launches named profiles whose bundle patches compose plugin rows. Profile, home, and invocation patch layers can modify that tree; agent presets form separate session-scoped compositions.
- The plugin manager and `dsh plugin` own external package installation. Web can apply config changes through HMR; other shipped profiles generally take patches on restart.
- Web/Desktop, CLI/headless, ACP, TypeScript SDK, and Python SDK use different client surfaces over the same agent and session services. An interactive command registry does not imply a command UI in every profile.

## `reference/deepseek-harness/packages/boot/` Index

- `app-boot/src/` — Profile resolution, bundle composition, plugin compatibility, and startup; large package.
- `cmdline/src/` — Shared `dsh` CLI dispatch.
- `plugin-manager/src/` — Package installation, profile mutation, version compatibility, and diagnostics; large package.
- `hmr/src/`, `config-editor/src/` — Config reload and editing.
- `app-boot/README.md`, `plugin-manager/README.md` — Profile and install behavior references.

## `reference/deepseek-harness/packages/bundle/` Index

- `base/cordis.patch.yml` — Shared plugin tree for base-backed profiles.
- `web-app/cordis.patch.yml` — Web-specific plugins and client/host composition.
- `web-app/presets/` — Preset-specific Web composition patches.
- `headless/`, `sdk-app/`, `sdk-minimal/`, `acp-app/` — Other profile bundles; `sdk-minimal` is independently composed.
- `README.md` — Bundle group map.

## `reference/deepseek-harness/apps/` Index

- `cli/src/`, `cli/config/`, `cli/reference/` — Launcher, profile templates, example overlays, and CLI reference.
- `cli/tests/profiles/` — Profile-level composition and startup tests.
- `cli/README.md`, `cli/composition.md` — CLI and product composition reference.
- `web/` — Browser-facing application and Web server integration; large tree.
- `desktop/`, `desktop-host/` — Electron shell and desktop host; large trees.

## `reference/deepseek-harness/packages/sdk/` Index

- `client/src/`, `protocol/src/`, `server/src/` — TypeScript JSON-RPC client, protocol, and server.
- `README.md` — SDK package map.

## Other application surfaces

- `packages/host/` — Web Host services and plugin inventory; large group.
- `packages/client/` — Browser runtime and many `ui-*` components; large group.
- `packages/api/` — Gateway and remote controllers; large group.
- `packages/acp/` — Automation-only Agent Client Protocol server.
- `python/` — Python SDK and packaged runtime; large tree.

## `reference/deepseek-harness/docs/` Index — Deployment references

- `architecture.md`, `development.md` — Profile layers and workspace development.
- `subsystems/boot.md`, `subsystems/web-server.md`, `subsystems/web-client.md`, `subsystems/commands.md` — Boot, UI host/client, and interactive command surfaces.
- `user/develop/` — Plugin development tutorials and framework guidance.
