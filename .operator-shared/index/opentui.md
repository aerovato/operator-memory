---
description: OpenTUI source map for Solid JSX compilation and terminal renderer reference
read_if: Working on Operator's OpenCode V2 TUI build, JSX reactivity, or renderer integration
---

# OpenTUI Reference

## Coverage

- `references/opentui/` (Git-ignored upstream source)

## Source checkout

- Upstream: https://github.com/anomalyco/opentui.git
- Destination: `references/opentui/`
- Commit: `4b1474e009bf78365a7a4866e83a9e522533ef42`
- Tracking branch: `main`

Clone only when needed, from the Operator repository root:

```sh
git clone --no-checkout --depth 1 --branch main https://github.com/anomalyco/opentui.git references/opentui
git -C references/opentui fetch --depth 1 origin 4b1474e009bf78365a7a4866e83a9e522533ef42
git -C references/opentui switch --detach 4b1474e009bf78365a7a4866e83a9e522533ef42
```

## Architecture

- The Solid package supplies the JSX runtime, Bun transform plugin, and reconciler used by OpenCode V2's terminal UI. Default Bun JSX compilation does not preserve reactive text expressions; the Solid build plugin compiles them into tracked insertions.

## `references/opentui/` Index

- `README.md`, `AGENTS.md`, `LICENSE`, `package.json`, `bun.lock` — Ditto
- `.github/`, `scripts/` — Upstream automation and build scripts; directory-only.
- `.editorconfig`, `.gitattributes`, `.gitignore`, `.oxfmtrc.json`, `.oxlintrc.json`, `.zig-version`, `opentui.pc.in` — Ditto

### `packages/` — OpenTUI workspace packages

- `core/`, `native/`, `react/`, `web/`, `examples/`, `keymap/`, `qrcode/`, `ssh/`, `three/` — Other packages; directory-only.

#### `packages/solid/` — Terminal Solid renderer and compiler

- `jsx-runtime.ts`, `jsx-dev-runtime.ts` — JSX runtime entrypoints.
- `index.ts` — Renderer and test-renderer exports.
- `components.ts`, `*.d.ts`, `package.json`, `tsconfig.json`, `tsconfig.build.json`, `bunfig.toml`, `README.md` — Ditto
- `scripts/solid-plugin.ts`, `scripts/solid-transform.ts` — Bun JSX transform registration and Babel-backed Solid compilation.
- `scripts/` — Other Solid build and runtime tooling; directory-only.
- `src/reconciler.ts` — JSX element creation, reactive insertion, and renderable mapping.
- `src/elements/`, `src/plugins/`, `src/renderer/`, `src/testing/`, `src/types/`, `src/utils/` — Renderer internals; directory-only.
- `src/scrollback.ts`, `src/time-to-first-draw.tsx` — Scrollback and rendering timing.
- `tests/`, `examples/` — Renderer behavior tests and usage examples; directory-only.
