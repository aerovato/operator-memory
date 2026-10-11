# Kiro Guide

Last Updated: October 5, 2026

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
- [`subagents.md`](./subagents.md) - General subagent inheritance, injection limitations, and Operator's integration scope.
- [`injection.md`](./injection.md) - Verified V3 injection behavior: main-agent hooks, subagent limitation, `KIRO_HOME` resolution defect, and custom-agent profile findings.

## Facility Summary

Operator-relevant facilities:

- `SessionStart` hook (IDE, CLI V3, Web): a `command` action exiting 0 has its stdout added to the agent's context. Primary preamble injection point.
- Always-included steering is necessary for subagent instructions. It is inherited context; executing Helper from those instructions is agent-driven loading, not automatic injection.
- Global skills (`~/.kiro/skills/`) become `/skill-name` slash commands. Natural surface for setup workflows.
- Hooks, steering, and skills are all plain files under `~/.kiro/` and `.kiro/` — no plugin installer or marketplace is required for local distribution; Powers are the marketplace-style packaging layer.
- No documented general subagent injection hook exists. Operator uses general mechanisms and does not require custom agents.

## Primary Sources

- [Kiro docs index](https://kiro.dev/llms.txt)
- [Hooks](https://kiro.dev/docs/hooks.md) and child pages
- [Steering](https://kiro.dev/docs/steering.md), [Skills](https://kiro.dev/docs/skills.md), [Powers](https://kiro.dev/docs/powers.md)
- [Configuration scopes](https://kiro.dev/docs/configuration.md)
- [Custom agents](https://kiro.dev/docs/custom-agents.md) and child pages
