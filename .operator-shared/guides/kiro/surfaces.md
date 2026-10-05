# Kiro Surfaces and Configuration

Last Updated: October 5, 2026

## Unified harness

All surfaces (IDE, CLI, Web, Mobile, ACP editors) are front ends to the same standalone agent-harness process, communicating over the open Agent Client Protocol (ACP) with Kiro-specific `_kiro/` extensions. Local clients connect over stdio; Web and Mobile connect to a sandboxed harness over WebSocket. A capability configured once (steering file, permission rule, hook) behaves identically wherever the harness runs.

Turn anatomy relevant to injection: context is assembled first (prompt, history, steering files, attachments, and `UserPromptSubmit` hooks that may inject context), then the model plans, tool calls are permission- and hook-checked, execute, and feed back until the turn completes (`Stop` hooks).

## Where the agent runs

- IDE and CLI run the harness locally by default; tools operate on the local filesystem and shell. Both can attach to cloud sessions.
- Web and Mobile run the same harness in a managed cloud sandbox; nothing executes on the user's machine.

## Configuration scopes

- Global (user) — `~/.kiro/`
- Project — `<project-root>/.kiro/`
- Agent — `~/.kiro/agents/` or `.kiro/agents/`

The documentation says `KIRO_HOME` redirects the global `~/.kiro` directory for agents, skills, steering, settings, and sessions. Verified exception: CLI binary `2.27.1` running the V3 engine (`--v3`), KAS `0.66.22`, ignores the override for global hooks, steering, and skills. All three resolve under ordinary `$HOME/.kiro/`; redirected resources are undiscovered. For this tested runtime, install Operator's resources where V3 actually reads them. Do not generalize to other configuration resources, versions, or IDE behavior. See [injection verification](./injection.md).

Key paths:

- Hooks: `~/.kiro/hooks/` or `.kiro/hooks/` (standalone `*.json` files)
- Steering: `~/.kiro/steering/` or `.kiro/steering/`
- Skills: `~/.kiro/skills/` or `.kiro/skills/`
- Powers: `~/.kiro/powers/` only (no project scope)
- Custom agents: `~/.kiro/agents/` or `.kiro/agents/`
- MCP servers: `~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json`
- CLI settings: `~/.kiro/settings/cli.json`

Conflict resolution: steering, skills, and hooks from all scopes are merged, not overridden. Same-name custom agents: project wins with a warning. Permissions use deny-overrides across all scopes.

Surface differences: Web and Mobile read project `.kiro/` config from the cloned repository (Mobile: steering and skills only; Web also MCP servers, custom agents, hooks) but never read global `~/.kiro/`. Users can upload personal config to cloud configuration via Kiro Web Settings > Sync; the cloud copy can optionally apply to new local sessions without writing local files.

## CLI essentials

Binary is `kiro-cli`. Useful commands for verification and scripting:

- `kiro-cli --agent <name>` — start a session with a specific agent
- `kiro-cli agent list` — list agents
- `kiro-cli agent create <name>` / `kiro-cli agent migrate` (2.x hook conversion)
- `kiro-cli powers install <name|path>` / `kiro-cli powers uninstall <name>`
- `kiro-cli settings <key> <value>` (with `--workspace` to scope)

In-session slash commands: `/agent swap`, `/config` (V3; category summary of agents, MCP, Powers, Steering, Skills, Hooks), `/context show` (loaded context/skills), `/model`, `/settings features`.

Headless mode exists for non-interactive CI use (`docs/cli/headless.md`, not yet researched in detail).
