# Operator Memory for Claude Code

Claude Code adapter for Operator Memory. Injects the preamble into the main system prompt and subagent task prompts. Commands and Helper installation support are not implemented yet.

Requires Claude Code `v2.1.287` or newer.

Requires `operator-helper` on `PATH`. The preamble is rendered once per process; restart Claude Code to reload memory.

Build with `bun run build` from this package directory.
