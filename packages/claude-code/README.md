# Operator Memory for Claude Code

Claude Code adapter for Operator Memory. Injects the preamble into the main system prompt and subagent task prompts. Helper installation support is not implemented yet.

Requires Claude Code `v2.1.287` or newer.

Requires `operator-helper` on `PATH`. The preamble is rendered once per process; restart Claude Code to reload memory.

Build with `bun run build` from this package directory.

## Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.
