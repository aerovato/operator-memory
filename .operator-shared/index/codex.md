---
description: "@aerovato/operator-codex package, preamble hook, Operator skills, tests, and local installation map"
read_if: Working in packages/codex or changing Codex plugin packaging, preamble injection, or commands
---

# Operator Codex Index

## Coverage

- `packages/codex/`

## Architecture

- `@aerovato/operator-codex` is a dependency-free legacy-format Codex plugin because current Codex clients load lifecycle hooks only from that format.
- One strictly typed, dependency-free launcher compiles to Node-compatible JavaScript and renders current memory through Helper for new or cleared sessions, post-compaction context, and delegated subagents; resume and fork retain prior injected history.
- Three explicitly invoked plugin skills bind Codex-native interaction to one Helper operation for each setup and indexing workflow.
- Local preview: `bun run build:codex && bun run preview:codex` generates a separate catalog under `.cache/codex-marketplace`, resets the prior `operator-local` registration through native removal, registers it via `codex plugin marketplace add` and installs or refreshes `aerovato@operator-local` through `codex plugin add`.

## `packages/codex/` Index

- `README.md`, `package.json`, `tsconfig.check.json` - Ditto.
- `.codex-plugin/plugin.json` - Legacy Codex plugin manifest, product/publisher presentation, image paths, and hook registration.
- `assets/aerovato-research.jpg` - Aerovato Research profile image used for listing and composer branding.
- `hooks/hooks.json` - Stable `SessionStart` and `SubagentStart` command-hook definitions with unlimited context output.
- `src/hook.ts` - Typed lifecycle input validation, filtering, Helper preamble execution, unchanged successful output, and user-visible blocking failure output.
- `scripts/build.ts` - Clean minified Node ESM launcher build.
- `skills/operator-user-init/`, `skills/operator-project-init/`, `skills/operator-index/` - Explicit-only Operator workflow skills and Codex invocation policy.
- `test/commands.test.ts` - Executes the declared hook commands through native shells, checking paths with spaces, stdin/stdout/stderr, and success/failure exit codes.
- `test/hook.test.ts` - Session-source filtering, subagent injection, working-directory forwarding, unchanged output, and failure coverage.
- `test/skills.test.ts` - Skill naming, single-operation contract, and explicit-invocation policy coverage.
