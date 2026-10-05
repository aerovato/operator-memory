---
description: OpenCode v2 core package source map
read_if: Researching OpenCode v2 core services, session execution, plugins, tools, or infrastructure
---

# `packages/core` — @opencode-ai/core (V2)

## Coverage

- `reference/opencode-v2/packages/core/`

## Architecture

- V2 core runtime: hosts nearly all domain services — sessions, agents, tools, plugins, permissions, config, database, filesystem, VCS, skills, MCP, and Effect infrastructure. The V1 `packages/opencode` app no longer exists; `server`, `cli`, and `tui` are thin consumers of core.
- Session behavior is governed by `reference/opencode-v2/specs/v2/session.md` and `tools.md`; consult those before changing session admission, execution, or tool laws.

## `reference/opencode-v2/packages/core/` Index

### `src/session/` — Session lifecycle and execution

- `session.ts` — Session service entry
- `execution.ts` / `execution/` — Execution coordinator; `restart.ts` handles execution restarts
- `run-coordinator.ts` — Joins same-session resumes, coalesces prompt wakeups
- `runner/` — Runner internals: `index.ts`, `llm.ts`, `max-steps.ts`, `model.ts`, `step.ts`, `retry.ts`, `prompt/`, `publish-llm-event.ts`, `to-llm-message.ts`
- `prompt.ts` / `prompt-node.ts` / `generate-node.ts` — Durable prompt admission and generation nodes
- `compaction.ts` — Compaction: history overflow, tool output pruning, summaries
- `context.ts` — Session context management
- `instructions.ts` / `instruction-state.ts` / `instruction-entry.ts` / `system-prompt.ts` — Instruction assembly and system prompts
- `projector.ts` — Event-sourced state to visible message projection
- `store.ts`, `sql.ts`, `history.ts`, `stats.ts` — Persistence, schema, history, usage stats
- `message.ts`, `message-updater.ts` — Message and part types, update persistence
- `revert.ts` / `revert-node.ts` — Revert to prior message/snapshot states
- `transfer.ts`, `inbox.ts`, `subagent-completion.ts`, `title.ts`, `environment.ts`, `event.ts`, `error.ts`, `info.ts`, `schema.ts` — Supporting session concerns

### `src/plugin/` — Plugin host, hooks, providers, skills

- `host.ts` — Plugin host: lifecycle, hook triggering, context construction
- `runtime.ts`, `module.ts`, `instance.ts`, `internal.ts`, `supervisor.ts` / `supervisor-service.ts` — Plugin runtime, module loading, supervision
- `sdk.ts` — SDK-facing plugin integration
- `hooks.ts` — Plugin hook definitions
- `agent.ts`, `command.ts` / `command/`, `provider.ts` / `provider/` — Agent, command, and provider hook surfaces; `provider/` holds built-in provider plugins
- `skill.ts` / `skill/`, `plan.ts`, `warming.ts`, `variant.ts`, `update.ts` — Skill hooks, plan support, model warming, variants, plugin updates
- `system-prompt.ts` / `system-prompt/`, `models-dev.ts`, `vcs/`, `websearch/`, `mcp-codemode-exclusion.ts` — Prompt, catalog, VCS, and websearch plugin surfaces
- `source-directory.ts` — Plugin source directory resolution

### `src/tool/` — Tool system

- `tool.ts` — Core tool type definitions
- `plugin/`, `runtime.ts`, `mcp.ts` — Plugin tools, tool runtime, MCP tools
- `read-filesystem.ts`, `http-body.ts`, `html-markdown.ts` — Filesystem reading and HTTP/markdown output helpers
- Tool construction/registration/outcome laws documented in `specs/v2/tools.md`

### `src/config/` — Configuration

- `config.ts` — Configuration loading, merging, validation
- `normalize.ts`, `variable.ts`, `markdown.ts` — Normalization, variables, markdown parsing
- `plugin/` — Plugin configuration

### `src/v1/` — V1 config migration

- `config/`, `permission.ts` — Legacy V1 config schemas and permission migration

### `src/effect/` — Effect runtime infrastructure

- `app-node-builder.ts`, `app-node-platform.ts` — App node layer composition and platform implementations
- `keyed-mutex.ts` — Per-key mutex with cleanup
- `websocket-constructor.ts` — WebSocket constructor layer

### `src/permission/` — Permissions

- `saved.ts`, `sql.ts` — Persisted permission decisions and schema

### `src/instructions/` — Instruction discovery

- `builtins.ts`, `index.ts` — Built-in and discovered instructions
- `instruction-discovery.ts` (root src) — Discovery entry

### Other `src/` directories

- `mcp/` — MCP client, stdio transport, OAuth, instructions
- `skill/` — Skill discovery and instruction resolution
- `database/` — SQLite database, migrations, generated Drizzle schema
- `filesystem/` — Filesystem services (watchers, search, protected access)
- `session/`, `plugin/`, `tool/`, `config/`, `effect/` — See above
- `agent.ts` — Agent service: definitions, permissions, models
- `app.ts`, `bus.ts`, `state.ts`, `rpc.ts` — Application, event bus, state, RPC
- `catalog.ts`, `model.ts`, `model-resolver.ts`, `provider.ts`, `models-dev.ts` / `models-dev/` — Model and provider catalogs
- `credential.ts` / `credential/`, `account/` — Credentials and accounts
- `command.ts`, `form.ts`, `job.ts`, `question.ts` — Commands, forms, jobs, questions
- `event.ts` / `event/`, `event-logger.ts` — Event system
- `file.ts`, `file-mutation.ts`, `file-retention.ts`, `filesystem.ts` — File services
- `git.ts`, `vcs.ts`, `snapshot.ts`, `worktree.ts` / `worktree/`, `repository.ts`, `repository-cache.ts` — VCS and snapshots
- `location.ts`, `location-services.ts`, `location-service-map.ts`, `location-mutation.ts`, `location-activity.ts`, `instance.ts` / `instance/`, `project.ts` / `project/`, `workspace.ts` — Location/project/workspace binding
- `permission.ts`, `policy via permission` — Permission checking
- `pty.ts` / `pty/`, `persistent-pty.ts` / `persistent-pty/`, `shell.ts` / `shell/` — Terminals and shells
- `ripgrep.ts` / `ripgrep/`, `image.ts` / `image/`, `websearch.ts` — Search, image processing, web search
- `aisdk.ts`, `aisdk-native.ts`, `generate.ts` — AI SDK model integration and generation
- `github-copilot/` — GitHub Copilot provider integration
- `oauth/`, `wellknown.ts` / `wellknown/`, `kv.ts` / `kv/`, `id/`, `util/`, `environment/`, `formatter.ts` / `formatter/`, `codemode/`, `integration.ts`, `reference.ts`, `schema.ts`, `v1/` — Supporting infrastructure
