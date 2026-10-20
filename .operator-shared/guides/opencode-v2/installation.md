# OpenCode V2 Plugin Installation and Local Development

Last Updated: October 20, 2026

Source-verified against the `origin/dev` reference clone (root package version `2.1.0`, pulled October 20, 2026), https://opencode.ai/v2/docs/plugins/ and `<reference>/opencode-v2/packages/cli/src/commands/handlers/plugin/`. Development-source findings below are not live-install verification. Replaces the V1 registration analysis in `../opencode-v1/local-development.md`.

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
- Current dev source watches configured local plugin directories even outside config roots (`packages/core/src/config/plugin/source.ts`) and tracks imported local files with content fingerprints and runtime-specific cache invalidation (`packages/core/src/plugin/module.ts`, `packages/plugin/src/source.ts`, `source.bun.ts`, `source.node.ts`). Local source changes can therefore reload without a service restart; this is source-verified, not live-tested here.

## Local Development

- Configure local plugin directories directly in `plugins`: relative directories, absolute directories, or `file://` directory URLs. Relative paths resolve from the config file containing the entry. Current dev rejects explicitly configured standalone files with `configured plugin path must be a directory`, despite the public docs still showing file examples (`packages/core/src/config/plugin/source.ts`).
- `.opencode/plugins/` discovery: direct `.ts`/`.js` files and immediate package directories (entrypoint `index.ts`/`index.js` resolved within the directory; symlinks followed). Source: `<reference>/opencode-v2/packages/core/src/plugin/source-directory.ts`.
- Plugin arrays from applicable config files apply lowest to highest precedence instead of replacing one another. A project-local plugin with the same ID as a global package does **not** shadow the package. In the current supervisor, `-<plugin-id>` removes the ID from a shared enabled set, and adding the local source re-enables the ID for both sources. The first source remains active and the second fails with `Duplicate plugin ID`; `opencode plugin list` shows both. To run the local build, remove the global package registration or confine the package registration to other projects. To run the package, omit the local source. There is no verified per-location suppression of just one source by ID (`<reference>/opencode-v2/packages/core/src/plugin/supervisor.ts`).
- V2 does **not** mirror V1's package-qualified `file:` identity dedup. `plugin add` rejects local paths and plugin arrays merge across config files. `-<plugin-id>` disables every source carrying that ID; re-adding a source with the same ID re-enables both, and the second fails as `Duplicate plugin ID`. A package's `./tui` loads automatically alongside the server entry; `cli.json` is for standalone terminal-only plugins.
- This repository uses one self-contained local installation command: `bun run install:opencode` builds and links Helper, builds the distinct dev ID through `build:opencode-v2:dev`, and registers the absolute `packages/opencode-v2/dist` directory in global server config after `-aerovato.operator-memory`. It preserves JSONC comments, unrelated settings, and package registrations. `OPENCODE_CONFIG_DIR` overrides the XDG/default config directory. There is no separate preview script or generated project config. The local directory needs `server.js` and `tui.js` entrypoints: unlike an npm package name, a bare local directory does not resolve the package's `exports` map. The plain build and published package retain the canonical ID.

## Other Native Local Registration Options

- Global local-build registration: put an absolute `packages/opencode-v2/dist` directory in the global server config's `plugins` array. With a distinct dev-ID build, preceding it with `-aerovato.operator-memory` disables the published plugin without removing its package registration. This applies to all locations using that global config; it is the direct native alternative to project-local preview config, not a `plugin add` operation.
- Directory discovery: a directory symlink under the global `plugins/` directory or project `.opencode/plugins/` can point at the build's `dist` directory. Both `plugin/` and `plugins/` are discovered, and directory symlinks are followed (`packages/core/src/plugin/source-directory.ts`). Discovery occurs before explicit plugin operations, so the distinct dev ID and disabling the canonical ID are still needed when the published package remains configured.
- Neither method provides V1-style package-identity replacement. Do not configure the published package and a canonical-ID local build together: `packages/core/src/plugin/supervisor.ts` keeps the first duplicate ID active and reports later ones as failures.

## Verification Notes

October 20, 2026: the repository's complete local installer built and linked Helper, built the dev-ID V2 package, and wrote global registration under an isolated `OPENCODE_CONFIG_DIR`. Focused tests verified JSONC comment/settings preservation, repeatability, and rejecting malformed configuration without overwriting it. This did not restart or validate loading in a running OpenCode service.

## Sources

- https://opencode.ai/v2/docs/plugins/
- `<reference>/opencode-v2/packages/cli/src/commands/handlers/plugin/add.ts`
- `<reference>/opencode-v2/packages/util/src/npm.ts`
- `<reference>/opencode-v2/packages/core/src/config/plugin/source.ts`
- `<reference>/opencode-v2/packages/core/src/plugin/source-directory.ts`, `module.ts`, `supervisor.ts`
- `<reference>/opencode-v2/packages/plugin/src/host.ts`, `source.ts`, `source.bun.ts`, `source.node.ts`
