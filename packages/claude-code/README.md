# Operator Memory for Claude Code

Operator Memory gives Claude Code durable project and user context maintained by agents as readable Markdown.

## Install

Requires Claude Code `v2.1.287` or newer and Operator Helper on `PATH`.

```sh
operator-helper install claude-code
```

Start a new Claude Code process after installation. Run `claude plugin list` to confirm `operator@operator-memory` is enabled, then ask the agent whether Operator Memory guidance is available.

The plugin injects the preamble into the main system prompt and subagent task prompts. It renders memory once per process; restart Claude Code to reload memory. `/clear` does not refresh the cached preamble.

## Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.

## Update

Rerun `operator-helper install claude-code` or use `claude plugin update operator@operator-memory`, then restart Claude Code.

See the [Claude Code guide](https://github.com/aerovato/operator-memory/blob/main/docs/harnesses/claude-code.md) for verification, updates, and troubleshooting. For local development, run `bun run preview:claude-code` from the workspace root.
