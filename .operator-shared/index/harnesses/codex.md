---
description: OpenAI Codex CLI reference source map focused on hooks, plugins, skills, trust, and session identity internals
read_if: Building the Operator Codex adapter or researching Codex hook execution, plugin packaging, skill invocation, hook trust, or thread identity
---

# Codex (reference/codex)

## Coverage

- `reference/codex` — openai/codex shallow clone, Rust workspace under `codex-rs/`.

## Architecture

- Rust workspace; `core` owns session/turn orchestration and hook dispatch, `hooks` is the hook engine, `core-plugins`/`plugin` own manifests and install layout, `ext/skills` owns skill discovery and prompt catalog, `tui` is the terminal client, `app-server*` the JSON-RPC client protocol.
- Operator research lives in `../../../guides/codex/`; this index maps source only.

## `codex-rs/hooks/src/` Index — hook engine

- `engine/discovery.rs` — handler discovery from config layers plus plugins; normalization, timeout rules, trust hash (`sha256` over normalized `{event, matcher, handler}`), trust states (`Trusted`/`Untrusted`/`Modified`/`Managed`).
- `engine/command_runner.rs` — command execution: JSON on stdin, session `cwd`, env injection (`PLUGIN_ROOT`, `PLUGIN_DATA`, `CLAUDE_*` aliases), 600s default timeout, async hooks (max 8 concurrent).
- `engine/output_parser.rs` — stdout JSON parsing per event.
- `events/session_start.rs` — SessionStart/SubagentStart run and output interpretation; plain stdout becomes context; `continue:false` honored only for SessionStart.
- `schema.rs` — wire input/output types for all events; `schema/generated/` — per-event JSON schemas.
- `output_spill.rs` — `additionalContextLimit`; ~2,500-token default; `0` disables spill; oversized output spills to `<tmp>/hook_outputs/<thread_id>/`.
- `config_rules.rs`, `lib.rs` — `[hooks.state]` trusted-hash resolution; `hook_key` format.

## `codex-rs/core/` Index — runtime dispatch and sessions

- `src/hook_runtime.rs` — event dispatch; `additionalContext` injected as a `developer` message appended to conversation history (persisted to rollout) before the turn's user prompt; async result drain; SessionStart→SubagentStart retargeting.
- `src/session/session.rs` — `InitialHistory` → `SessionStartSource` mapping; SessionStart is queued and runs at the start of the next turn, before the first model request.
- `src/state/session.rs` — pending session-start queue.
- `src/thread_manager.rs` — thread lifecycle: new/resume keep ThreadId; fork creates a new ThreadId with lineage; `/new` and `/clear` start fresh threads.
- `src/thread_rollout_truncation.rs` — fork/resume rollout truncation at user-turn boundaries; items before the first user message (including hook developer messages) are always retained.
- `src/skills.rs` — core glue for skill loading/invocation telemetry.

## `codex-rs/core-plugins/` and `codex-rs/plugin/` Index — packaging

- `core-plugins/src/agent_plugin_manifest.rs` — Agent Plugins root `plugin.json` (`agent-plugins.org` schema) plus `extensions."com.openai"` object; defaults `./skills`, `./mcp.json`.
- `core-plugins/src/manifest.rs` — legacy `.codex-plugin/plugin.json` parsing; `hooks` as path, path array, or inline object.
- `core-plugins/src/loader.rs` — plugin loading; default `hooks/hooks.json` fallback; `PLUGIN_ROOT`/`PLUGIN_DATA` wiring; suppresses hooks for portable `AgentPlugin`-format manifests (legacy format only loads hooks in this revision).
- `core-plugins/src/store.rs` — install layout: `plugins/cache/<marketplace>/<name>/<version|local>`, data at `plugins/data/...` (Agent Plugins: `agent-plugins/<sha256>`).
- `core-plugins/src/marketplace.rs`, `marketplace_add.rs` — `.agents/plugins/marketplace.json` and install flow.
- `core-plugins/src/remote.rs`, `remote/` — ChatGPT-hosted plugin install/sync shared between desktop and CLI.
- `plugin/src/manifest.rs` — plugin manifest model (skills/mcp/apps/hooks paths).

## `codex-rs/skills/` and `codex-rs/ext/skills/` Index — skills

- `skills/src/model.rs`, `parser.rs` — SKILL.md frontmatter (`name`, `description` ≤1024, `short_description`).
- `ext/skills/src/loader/` — root scanning (`~/.codex/skills`, project `.codex`/`.agents/skills`, plugin `skills/`), `agents/openai.yaml`.
- `ext/skills/src/catalog_prompt.rs` — injected `## Skills` catalog and trigger rules (`$SkillName` or plain-name mention must use the skill).
- `ext/skills/src/selection.rs` — explicit mention matching; `ext/skills/src/invocation.rs` — implicit invocation attribution.

## `codex-rs/config/`, `codex-rs/tui/`, other

- `config/src/hook_config.rs` — `HooksFile`, handler config shape (`command`/`mcp_tool`; `prompt`/`agent` parse but are skipped), `additionalContextLimit`.
- `config/src/types.rs` — `[plugins."name@source"]` enablement; `config/src/skills_config.rs` — `[skills]` config.
- `tui/src/slash_command.rs` — fixed slash-command registry; skills are not slash commands; `/skills` is a picker.
- `tui/src/hooks_rpc.rs`, `tui/src/startup_hooks_review.rs` — `/hooks` trust writes and startup trust-review modal.
- `protocol/src/thread_id.rs` — ThreadId UUIDv7.
- `rollout/`, `app-server*`, `prompts/` — session persistence, client protocol, custom prompts.
- Remaining workspace crates — out of scope for adapter work.
