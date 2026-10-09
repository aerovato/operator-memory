# OpenCode V2 Plugin Installation and Local Development

Last Updated: September 29, 2026

Verified against OpenCode 2.0.18, https://opencode.ai/v2/docs/plugins/ and `<reference>/opencode-v2/packages/cli/src/commands/handlers/plugin/`. Replaces the V1 registration analysis in `../opencode-v1/local-development.md`.

## Side-by-Side with V1

OpenCode 2 is the standard `opencode` binary; `opencode2` is no longer the standard separate beta installation. V2 reads the existing global and project server config locations and normalizes supported V1 fields in memory. V1 plugin implementations do not run in V2.

## CLI Plugin Management

```sh
opencode plugin add opencode-acme-plugin@1.2.0
opencode plugin list --builtin
opencode plugin check
opencode plugin update
opencode plugin remove opencode-acme-plugin@1.2.0
```

`plugin add` behavior (source-verified):

- Accepts npm names with versions/tags/ranges and npm-compatible Git specs (`github:acme/plugin`, `git+ssh://...#main`, `::path:` subdirectory selectors). Local paths must be configured directly; tarball and npm alias targets are rejected.
- Installs the package resolving subpaths `server` and `""` (root) for the server entrypoint, and `tui` for the terminal entrypoint. A package with neither fails with "no server or TUI entrypoint".
- A server entrypoint is written to the global server config (`~/.config/opencode/opencode.json(c)` `plugins` array, JSONC-preserving edit, mode 0600). A TUI-only entrypoint is written to global `cli.json`.
- Deduplication is by exact spec string or object `package` field equality — it does not dedupe a bare name against a versioned or `file:` spec of the same package.

## Background Install and Updates

- Server startup loads cached package plugins immediately, installs missing packages in the background, and checks unpinned npm and Git plugins for updates without changing the installed package.
- Exact npm versions and full Git commit hashes stay pinned.
- `opencode plugin check` reports outdated packages and `opencode plugin update [target]` invokes native updates for server and terminal plugins (`<reference>/opencode-v2/packages/cli/src/commands/handlers/plugin/update.ts`).
- Changes under watched config directories reload automatically (`touch` a plugin file, or `opencode service restart`). Changes to unwatched local dependencies may still require a restart because imported modules are process-cached.

## Local Development

- Configure local plugin directories or files directly in `plugins`: `"./plugins/local"`, `"../shared/plugin.ts"`, absolute paths, or `file://` URLs. Relative paths resolve from the config file containing the entry.
- `.opencode/plugins/` discovery: direct `.ts`/`.js` files and immediate package directories (entrypoint `index.ts`/`index.js` resolved within the directory; symlinks followed). Source: `<reference>/opencode-v2/packages/core/src/plugin/source-directory.ts`.
- Plugin arrays from applicable config files apply lowest to highest precedence instead of replacing one another. A project-local plugin with the same ID as a global package does **not** shadow the package. In the current supervisor, `-<plugin-id>` removes the ID from a shared enabled set, and adding the local source re-enables the ID for both sources. The first source remains active and the second fails with `Duplicate plugin ID`; `opencode plugin list` shows both. To run the local build, remove the global package registration or confine the package registration to other projects. To run the package, omit the local source. There is no verified per-location suppression of just one source by ID (`<reference>/opencode-v2/packages/core/src/plugin/supervisor.ts`).
- V2 does **not** mirror V1's package-qualified `file:` identity dedup. `plugin add` rejects local paths and plugin arrays merge across config files. `-<plugin-id>` disables every source carrying that ID; re-adding a source with the same ID re-enables both, and the second fails as `Duplicate plugin ID`. A package's `./tui` loads automatically alongside the server entry; `cli.json` is for standalone terminal-only plugins.
- This repository's local preview uses a distinct plugin ID for the local build so the global npm registration can be disabled per-project. `bun run preview:opencode` is self-contained: it builds and links the local Helper (`install:helper`), builds the dev-ID plugin bundle (`build:opencode-v2:dev`, which sets `OPERATOR_PLUGIN_ID=aerovato.operator-memory-dev`; the plain build and the published package keep the canonical `aerovato.operator-memory`), then writes `.opencode/opencode.json` with `"plugins": ["-aerovato.operator-memory", "../packages/opencode-v2/dist"]`: the `-` entry disables only the npm plugin in this location, and the local build loads under its dev ID. The local directory needs `server.js` and `tui.js` entrypoints: unlike an npm package name, a bare local directory does not resolve the package's `exports` map.
