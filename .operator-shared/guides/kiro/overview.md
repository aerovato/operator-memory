# Kiro Guide

Last Updated: November 25, 2026

Official-documentation reference for Kiro, AWS's AI coding agent. Research was retrieved October 4, 2026 from `https://kiro.dev/docs` (indexed via `https://kiro.dev/llms.txt`; every page has a `.md` twin for clean Markdown). Undocumented behavior is not treated as fact.

## Scope

Kiro is one unified agent harness fronted by multiple surfaces:

- Kiro IDE (desktop, 1.x)
- Kiro CLI (`kiro-cli`, V3 runs the unified harness; 2.x is legacy)
- Kiro Web (cloud sandbox)
- Kiro Mobile (iOS, cloud sessions)
- Any ACP-compatible editor (JetBrains, Zed) via Kiro as ACP agent

Kiro Crew is a separate orchestration product with its own agent backends (Kiro CLI, Claude Code, OpenCode, and others); it is out of scope for adapter work.

## Terminology

- Harness — the standalone agent process all surfaces talk to over ACP. Capabilities are documented once at the harness level; surfaces differ only in how you drive them.
- Steering — persistent markdown context files (Kiro's analog of injected instructions).
- Skill — portable instruction package following the open Agent Skills standard (`agentskills.io`).
- Power — plugin package following the open Agent Plugins specification (`agent-plugins.org`), bundling skills, MCP servers, and knowledge, activated by keywords.
- Agent profile — custom agent configuration in `.kiro/agents/` or `~/.kiro/agents/`.

## Guide Map

- [`surfaces.md`](./surfaces.md) - Harness architecture, surfaces, configuration scopes, and CLI verification commands.
- [`hooks.md`](./hooks.md) - Hook file schema, triggers, stdin/exit-code contract, blocking, caching, and legacy formats.
- [`steering.md`](./steering.md) - Steering scopes, inclusion modes, file references, AGENTS.md, and inherited subagent instructions.
- [`skills.md`](./skills.md) - Agent Skills format, locations, activation, and slash commands.
- [`powers.md`](./powers.md) - Agent Plugins packaging, manifests, and installation pathways.
- [`injection.md`](./injection.md) - Verified V3 injection behavior: main-agent hooks, subagent inheritance and its limitation, `KIRO_HOME` resolution defect, and custom-agent profile findings.

## Binding

The implemented binding is [`specs/kiro/implementation.md`](../../specs/kiro/implementation.md):

- A global `SessionStart` command hook runs `operator-helper preamble`; its stdout is added to the main agent's context.
- Built-in subagents do not receive that hook output. An always-included steering file tells any agent missing the preamble to run Helper itself.
- Setup workflows are explicitly invoked global skills, which Kiro exposes as `/skill-name` slash commands.
- The adapter is plain files under `~/.kiro/` written by Helper; no package, plugin, or custom agent is involved.

## Primary Sources

- [Kiro docs index](https://kiro.dev/llms.txt)
- [Hooks](https://kiro.dev/docs/hooks.md) and child pages
- [Steering](https://kiro.dev/docs/steering.md), [Skills](https://kiro.dev/docs/skills.md), [Powers](https://kiro.dev/docs/powers.md)
- [Configuration scopes](https://kiro.dev/docs/configuration.md)
- [Custom agents](https://kiro.dev/docs/custom-agents.md) and child pages
