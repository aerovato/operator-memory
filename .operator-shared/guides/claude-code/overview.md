# Claude Code Guide

Last Updated: October 2, 2026

Implementation reference for porting Operator Memory to Claude Code. Primary sources: the official `anthropics/claude-code` repository (cloned locally under `<reference>/claude-code-docs/`) and the live documentation at `code.claude.com/docs`, retrieved October 2, 2026.

## Scope

- Claude Code CLI (terminal, including IDE integrated terminals and JetBrains)
- Claude Code Desktop app Code tab and VS Code extension — same plugin format and settings
- Cloud sessions (`claude.ai/code`) do not load locally installed plugins; out of scope for the adapter

## Terminology

- Plugin — a directory installed and loaded as one unit; manifest at `.claude-plugin/plugin.json`
- Marketplace — a catalog (repo or JSON file with `.claude-plugin/marketplace.json`) listing plugins and their sources
- Settings hook — the classic hook: a shell command, HTTP endpoint, MCP tool call, LLM prompt, or subagent configured in `hooks/hooks.json` or settings files
- Mod — a plugin whose behavior is a JavaScript/TypeScript hooks module (`register(on)`) running inside Claude Code's process; mods require Claude Code v2.1.287+
- Skill — a `SKILL.md` instruction file; plugin skills are invocable as `/<plugin>:<skill>` commands

## Guide Map

- [`injection.md`](./injection.md) - Preamble injection surfaces: SessionStart, SubagentStart, UserPromptSubmit, instruction files, and the mod prompt events; the 10k context cap and pathway recommendation.
- [`hooks.md`](./hooks.md) - Settings-hook system: configuration formats, handler types, matchers, input/output contract, exit codes, environment, and policy restrictions.
- [`commands.md`](./commands.md) - Slash commands and skills for the four Operator command intents.
- [`plugins.md`](./plugins.md) - Packaging, manifest, marketplaces, installation scopes, CLI, updates, and development workflow.
- [`mods.md`](./mods.md) - The in-process mod API: event middleware, prompt and command events, API surface, and its fit as Operator's transform pathway.

## Facility Summary

Claude Code exposes everything the adapter contract requires:

- `SessionStart` hooks (command type) inject context per session, re-firing on resume, clear, compact, and fork via matcher — a persisted-context pathway
- `SubagentStart` hooks inject the same context per subagent with copy-once dedupe
- Plugin commands surface as `/<plugin>:<command>`, matching `/operator:*` naming directly
- Plugins distribute through GitHub/git/npm/local marketplaces with a `claude plugin` CLI for scripted installation
- Mods offer an in-process alternative: `prompt.context`, `prompt.section`, and `turn.step` events are a model-boundary transform pathway

Key constraints to design around: the 10,000-character cap on hook-injected context, `SessionStart`'s inability to block on unexpected failure, and hook configuration being loaded only at session start.
