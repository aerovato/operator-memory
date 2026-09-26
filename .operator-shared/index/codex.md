---
description: "@aerovato/operator-codex package and local installation map"
read_if: Working in packages/codex or changing Codex plugin packaging
---

# Operator Codex Index

## Coverage

- `packages/codex/`

## Architecture

- `@aerovato/operator-codex` is a legacy-format Codex plugin package because current Codex clients load lifecycle hooks only from that format.
- The current package establishes installation infrastructure only; hook and skill behavior are added in later implementation phases.

## `packages/codex/` Index

- `package.json` - Published package metadata and included plugin assets.
- `.codex-plugin/plugin.json` - Minimal legacy Codex plugin manifest.
