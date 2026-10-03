# Operator Memory for Claude Code

Claude Code adapter for Operator Memory. Injects the preamble into the main system prompt and subagent task prompts.

Requires Claude Code `v2.1.287` or newer.

Requires `operator-helper` on `PATH`. The preamble is rendered once per process; restart Claude Code to reload memory.

Build with `bun run build` from this package directory.

Install or update with `operator-helper install claude-code`, then start a new Claude Code session. For local development, run `bun run preview:claude-code` from the workspace root.

## Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.
