---
description: Current anthropics/claude-code official repository map - plugin examples, the TypeScript mod/plugin API and type declarations, hook/settings/MDM examples, and repo maintenance scripts
read_if: Porting the Operator plugin to Claude Code, designing its manifest, hooks, commands, or skills, or researching the current mod/plugin engine API
---

# Claude Code Official Repository

**Currency: this repository is up to date and reflects the current state of Claude Code.** It is not the CLI source; it contains official plugin examples, plugin development guides, the in-process mod/plugin TypeScript API and its type declarations, and configuration examples.

## Coverage

- `reference/claude-code-docs/` — clone of `github.com/anthropics/claude-code` (shallow, git-ignored)

## Architecture

- Three plugin-relevant corpora:
  - `plugins/` — official example plugins (manifest `.claude-plugin/plugin.json`, commands, agents, skills, hooks), including `plugin-dev`, a full plugin-authoring toolkit with reference docs per plugin feature.
  - `mods/` — source of the four built-in engine mods. A **mod** is a plugin whose behavior is a TypeScript hooks module: `hooks/hooks.json` names module entry points, each exporting `register(on, options)`; handlers are `($, e, next)` over engine events; types come from `mods/types/claude-code.d.ts` (`import type ... from 'claude-code'`). Runnable from source with `claude --plugin-dir mods/<name>` and testable with `claude plugin test mods/<name>`.
  - `examples/` — hook script, settings, MDM managed-settings, and API-gateway examples.
- Operator-relevant mod events glimpsed in the type declarations: `session.start`, `prompt.section` (named prompt sections, e.g. memory), `prompt.context` (context blocks), `prompt.compose`, `command.run`/`command.describe`, `plugin.register`, `tool.call`/`tool.check`. These are the programmatic injection and command surfaces; `mods/types/claude-code.d.ts` is the canonical contract.
- The mod layering/seating model matters for Operator: `sec-default` seats outermost and keeps org-managed hooks, settings, and policy out of reach of installed plugins.

## `reference/claude-code-docs/` Index

### Repository root

- `README.md`, `demo.gif` — repository landing page.
- `CLAUDE.md` — guidance for agents working in this repository.
- `CHANGELOG.md` — Claude Code release changelog.
- `SECURITY.md`, `LICENSE.md`, `feed.xml`, `.vscode/` — Ditto.
- `Script/run_devcontainer_claude_code.ps1` — devcontainer launcher.

### `plugins/` — Official example plugins

- `README.md` — catalog table of every plugin here with contents and installation.
- `plugin-dev/` — the authoritative plugin-authoring toolkit. `/plugin-dev:create-plugin` 8-phase workflow, agents (`agent-creator`, `plugin-validator`, `skill-reviewer`), and seven skills: `plugin-structure` (manifest reference, minimal/standard/advanced examples, component patterns), `command-development` (frontmatter reference, plugin features reference, interactive commands, testing strategies, marketplace considerations), `hook-development` (patterns, advanced, migration, example shell hooks, hook-linter and schema validators), `skill-development`, `agent-development` (system-prompt design, triggering), `plugin-settings` (settings read/write hooks and commands, frontmatter parsing), `mcp-integration` (stdio/http/sse server examples, auth, tool usage). Start here for any Operator plugin question.
- `hookify/` — Python-implemented plugin: `/hookify` rules engine over `UserPromptSubmit`/`Stop` hooks; largest real-world hook-command plugin example (`core/`, `matchers/`, `hooks/`).
- `security-guidance/` — `PreToolUse` Python hook suite (`hooks.json`, pattern matching, session state, SDK wiring).
- `learning-output-style/`, `explanatory-output-style/` — minimal `SessionStart` context-injection plugins (`hooks/hooks.json` + `hooks-handlers/session-start.sh`); closest analogues to Operator's preamble injection.
- `ralph-wiggum/` — `Stop`-hook iteration loop with setup scripts.
- `code-review/`, `pr-review-toolkit/`, `feature-dev/` — command-plus-multi-agent workflow plugins.
- `commit-commands/`, `agent-sdk-dev/`, `frontend-design/`, `claude-opus-4-5-migration/` — single-concern command, agent, and skill plugins.

### `mods/` — Built-in engine mod sources (current programmatic API)

- `README.md` — defines the mod concept, the four shipped mods and their seating, `--plugin-dir` source running, and `claude plugin test`.
- `types/claude-code.d.ts` — **canonical engine/plugin TypeScript declarations** (~13k lines): event catalog (`tool.call`, `tool.check`, `prompt.section`, `prompt.context`, `prompt.compose`, `command.run`, `session.*`, `plugin.register`, ...), hook signatures `($, e, next)`, matchers, `EngineInterface` (`$`) with session/tool/config nouns, `on("*")`, module `register(on, options)` contract. The single most important file for a programmatic Operator plugin.
- `agents-md/` — `AGENTS.md` loading mod with modes (`claude-md-or-agents-md` default, `and`, `managed-only`, `claude-md`); documents how instruction files are placed into the prompt.
- `diff/` — `/diff` pane mod; large tree (800+ files) — read `README.md`, `hooks/hooks.json`, and `register.ts` entry only.
- `sec-default/` — managed-policy isolation mod; defines what installed plugins cannot touch.
- `telemetry/` — `$.telemetry` hook/batching example; very large tree of small hook files — directory only unless telemetry is the task.
- `tsconfig.json` — shared mod TypeScript config.

### `examples/` — Configuration examples

- `hooks/bash_command_validator_example.py` — reference hook script.
- `settings/` — strict/lax/bash-sandbox `settings.json` samples plus README.
- `mdm/` — managed-settings deployment for macOS and Windows (mobileconfig, ADMX templates).
- `gateway/` — AWS/GCP Terraform for an LLM API gateway in front of Claude Code.

### `scripts/` — Repository maintenance

- Issue triation automation (labels, duplicate commenting, sweeps); not plugin-relevant.
