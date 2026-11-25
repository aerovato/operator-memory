# Claude Code Guide

Last Updated: November 21, 2026

Implementation reference for porting Operator Memory to Claude Code. Primary sources: the official `anthropics/claude-code` repository (cloned locally under `references/claude-code-docs/`) and the live documentation at `code.claude.com/docs`, retrieved October 2, 2026.

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

- [`injection.md`](./injection.md) - Preamble injection surfaces: SessionStart, SubagentStart, UserPromptSubmit, instruction files, and the mod prompt events; the 10k context cap.
- [`hooks.md`](./hooks.md) - Settings-hook system: configuration formats, handler types, matchers, input/output contract, exit codes, environment, and policy restrictions.
- [`commands.md`](./commands.md) - Slash commands and skills for Operator setup.
- [`plugins.md`](./plugins.md) - Packaging, manifest, marketplaces, installation scopes, CLI, updates, and development workflow.
- [`mods.md`](./mods.md) - The in-process mod API: event middleware, prompt and command events, API surface, and its fit as Operator's transform pathway.
- [`installation.md`](./installation.md) - Plugin installation pathways: the direct npm gate, persistent distribution, and session-only loading.

## Facility Summary

Claude Code exposes the facilities the adapter uses:

- Mod `prompt.compose` appends an uncapped, session-scoped system-prompt section on every model call
- Mod `agent.spawn` carries the preamble to non-forked subagents
- Plugin skills surface as `/operator:<skill>`, matching `/operator:*` naming directly
- A repository marketplace with an npm plugin source installs and updates the plugin

`SessionStart` and `SubagentStart` settings hooks are a capped fallback (10,000 characters per string). Mods require Claude Code v2.1.287+; `disableAllHooks`, `--bare`, and `--safe-mode` suppress mod injection, and managed policy can restrict mods.
