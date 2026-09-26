---
description: "@aerovato/operator-codex package, preamble hook, tests, and local installation map"
read_if: Working in packages/codex or changing Codex plugin packaging or preamble injection
---

# Operator Codex Index

## Coverage

- `packages/codex/`

## Architecture

- `@aerovato/operator-codex` is a dependency-free legacy-format Codex plugin because current Codex clients load lifecycle hooks only from that format.
- One strictly typed, dependency-free launcher compiles to Node-compatible JavaScript and renders current memory through Helper for new or cleared sessions, post-compaction context, and delegated subagents; resume and fork retain prior injected history.

## `packages/codex/` Index

- `package.json`, `tsconfig.check.json` - Ditto.
- `.codex-plugin/plugin.json` - Legacy Codex plugin manifest and hook registration.
- `hooks/hooks.json` - Stable `SessionStart` and `SubagentStart` command-hook definitions with unlimited context output.
- `src/hook.ts` - Typed lifecycle input validation, filtering, Helper preamble execution, unchanged successful output, and user-visible blocking failure output.
- `scripts/build.ts` - Clean minified Node ESM launcher build.
- `test/hook.test.ts` - Session-source filtering, subagent injection, working-directory forwarding, unchanged output, and failure coverage.
