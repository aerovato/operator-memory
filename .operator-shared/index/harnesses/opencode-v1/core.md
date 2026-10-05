---
description: OpenCode core package source map
read_if: Researching OpenCode core services, sessions, tools, plugins, or infrastructure
---

# `packages/core` — @opencode-ai/core

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `reference/opencode-v1/packages/core/`

## Architecture

- Shared core library providing the foundational layer for the entire OpenCode application: filesystem abstractions, Effect runtime infrastructure, database, npm management, file locking, logging, observability, session/agent/tool/plugin services, and utility functions. The core package has been substantially expanded and now hosts many modules previously in `packages/opencode`.

## `reference/opencode-v1/packages/core/` Index

### `src/effect/` — Effect runtime, layer composition, and concurrency

- `app-node.ts` — `Node` namespace with `GlobalNode` and `LocationNode` types, `makeGlobalNode`/`makeLocationNode` constructors for location-scoped and global dependency layers
- `app-node-builder.ts` — Builder for composing application nodes into a runtime layer graph
- `app-node-platform.ts` — Platform-specific implementations (Bun vs Node) for app node infrastructure
- `keyed-mutex.ts` — `KeyedMutex`: in-memory per-key mutex with automatic cleanup; same key queues, different keys run independently
- `layer-node.ts` — `LayerNode`: typed dependency-injection layer graph with tag system, dependency checking, and composition
- `memo-map.ts` — Shared Effect Layer memo map for caching layer construction across runtimes
- `runtime.ts` — Factory for creating Effect ManagedRuntime instances that merge a service layer with observability
- `service-use.ts` — `serviceUse`: wraps a Context tag so callers invoke service methods directly with the tag automatically added to the Effect requirement

### `src/util/` — General-purpose utility modules

- `array.ts` — `findLast` helper: searches an array from the end for the first matching element
- `binary.ts` — `Binary` namespace with binary-search `search` and sorted `insert` operations on arrays
- `effect-flock.ts` — Effect-based file locking service using directory-based POSIX locks with stale detection, heartbeats, and retry scheduling
- `encode.ts` — Base64 URL-safe encode/decode, SHA-256 hashing, FNV-1a checksum, and sampled checksum for large content
- `error.ts` — `NamedError` base class using Zod schemas for typed, serializable error objects
- `flock.ts` — Promise-based file locking with directory mkdir atomicity, stale lock cleanup, heartbeat, exponential backoff, and AbortSignal support
- `fn.ts` — Zod-schema-validated function wrapper: validates input against a schema before invoking the callback
- `glob.ts` — `Glob` namespace wrapping the `glob` and `minimatch` packages for async/sync file pattern scanning and matching
- `hash.ts` — `Hash.fast`: SHA-1 hash helper using Node's crypto module
- `identifier.ts` — `Identifier` namespace generating sortable 26-char base62 IDs (ascending or descending) with embedded timestamps
- `iife.ts` — Tiny `iife` helper for immediately-invoked function expressions
- `lazy.ts` — `lazy` thunk factory: defers computation until first access, then caches the result
- `module.ts` — `Module.resolve`: resolves a module ID relative to a directory using Node's `createRequire`
- `path.ts` — Path manipulation utilities: filename extraction, directory splitting, extension detection, and middle truncation
- `retry.ts` — Generic async `retry` with exponential backoff, configurable attempts, and transient-error detection
- `slug.ts` — `Slug.create`: generates random adjective-noun pairs for human-readable identifiers
- `token.ts` — `Token.estimate`: rough token count from string length (chars / 4)
- `which.ts` — `which`: resolves a command's full path using PATH lookup, with OpenCode's bin dir appended
- `wildcard.ts` — `Wildcard.match`: glob-style pattern matching (`*` and `?`) against a string with path normalization

### `src/config/` — Configuration schemas and loading

- `agent.ts` — Agent config schema (model, permissions, temperature, prompt, mode)
- `attachments.ts` — Attachment processing config
- `command.ts` — Slash command config schema
- `compaction.ts` — Compaction config schema
- `experimental.ts` — Experimental feature toggles config
- `formatter.ts` — Code formatter config
- `lsp.ts` — LSP server config
- `markdown.ts` — Markdown parsing utilities for config
- `mcp.ts` — MCP server config
- `plugin.ts` — Plugin config schema
- `provider.ts` — Provider config (models, autodetect, options)
- `reference.ts` — Reference config
- `tool-output.ts` — Tool output truncation config
- `watcher.ts` — Filesystem watcher config

### `src/v1/` — Legacy V1 config types and migration

- `config/` — V1 config schemas: `agent.ts`, `attachment.ts`, `command.ts`, `config.ts`, `console-state.ts`, `error.ts`, `formatter.ts`, `layout.ts`, `lsp.ts`, `mcp.ts`, `migrate.ts`, `permission.ts`, `plugin.ts`, `provider-options.ts`, `provider.ts`, `skills.ts`
- `permission.ts` — V1 permission definitions
- `session.ts` — V1 session types

### `src/database/` — SQLite database, migrations, and schema

- `database.ts` — Database service: connection management, query execution, transaction support
- `migration.ts` — Migration runner using Drizzle Kit
- `migration.gen.ts` — Generated migration journal
- `migration/` — Timestamped migration files (38 migrations as of latest)
- `path.ts` — Database file path resolution
- `schema.gen.ts` — Generated Drizzle schema exports
- `schema.sql.ts` — Raw SQL schema definitions
- `sqlite.ts` — SQLite abstraction interface
- `sqlite.bun.ts` — Bun-native SQLite implementation
- `sqlite.node.ts` — Node.js SQLite implementation (better-sqlite3)

### `src/session/` — Session lifecycle, execution, and V2 core

- `compaction.ts` — Session compaction service: message history overflow management, tool output pruning, summary generation
- `context-epoch.ts` — Context epoch persistence for session history snapshots
- `error.ts` — Session error types
- `event.ts` — Session event definitions
- `execution.ts` / `execution/` — Session execution coordinator and local execution; separates durable prompt admission from model execution
- `history.ts` — Session history selection and retrieval
- `info.ts` — Session info utilities
- `input.ts` — Session input handling and inbox
- `message.ts` — Message part types: `TextPart`, `ReasoningPart`, `ToolInvocationPart`, `SourceUrlPart`, `FilePart`, `StepStartPart`, `Info`
- `message-updater.ts` — Message update and persistence logic
- `projector.ts` — Session projector: converts internal event-sourced state to visible messages
- `prompt.ts` — Durable session prompt admission
- `revert.ts` — Session revert: restores previous message/snapshot states
- `run-coordinator.ts` — `SessionRunCoordinator`: joins same-session resumes, coalesces prompt wakeups, allows concurrent sessions
- `runner/` — Session runner internals: `index.ts`, `llm.ts`, `max-steps.ts`, `model.ts`, `publish-llm-event.ts`, `to-llm-message.ts`
- `schema.ts` — `SessionID`, `MessageID`, `PartID` branded types
- `sql.ts` — Session database schema (Drizzle tables)
- `store.ts` — Session store: persistence and retrieval
- `todo.ts` — Session todo list management

### `src/tool/` — Tool system (core definitions and registry)

- `tool.ts` — Core tool type definitions: `Def`, `Context`, `ExecuteResult`, `Info` interfaces
- `registry.ts` — Tool registry: aggregates built-in and custom tools, resolves per agent/model
- `builtins.ts` — Built-in tool aggregation
- `tools.ts` — Tool collection utilities
- `application-tools.ts` — Application-level tool registration
- `read.ts` / `read-filesystem.ts` — Read tool: file/directory reading with offset/limit, LSP diagnostics
- `write.ts` — Write tool: creates or overwrites files
- `edit.ts` — Edit tool: targeted string replacement
- `grep.ts` — Grep tool: regex content search via ripgrep
- `glob.ts` — Glob tool: file pattern matching
- `bash.ts` — Bash tool: shell command execution
- `apply-patch.ts` — Apply patch tool: unified diff application
- `webfetch.ts` — Web fetch tool: URL content retrieval and conversion
- `websearch.ts` — Web search tool: Exa and Parallel providers
- `question.ts` — Question tool: interactive user questions
- `todowrite.ts` — Todo write tool: session todo updates
- `skill.ts` — Skill tool: loads and displays skill content
- `http-body.ts` — HTTP body utilities for tool responses
- `AGENTS.md` — Agent instructions for the tool module

### `src/plugin/` — Plugin host, hooks, and built-in providers

- `host.ts` — Plugin host: lifecycle management, hook triggering, plugin context construction
- `internal.ts` — Internal plugin utilities and parsing
- `promise.ts` — Promise-based plugin promise handling
- `layer-map.example.ts` — Example layer map for plugin dependency injection
- `agent.ts` — Plugin agent hooks
- `command.ts` — Plugin command hooks
- `command/` — Command prompt templates (`initialize.txt`, `review.txt`)
- `provider.ts` — Plugin provider hooks
- `provider/` — Built-in provider plugins (32 providers): `openai.ts`, `anthropic.ts`, `google.ts`, `google-vertex.ts`, `amazon-bedrock.ts`, `azure.ts`, `cloudflare-workers-ai.ts`, `cloudflare-ai-gateway.ts`, `cohere.ts`, `deepinfra.ts`, `dynamic.ts`, `gateway.ts`, `github-copilot.ts`, `gitlab.ts`, `groq.ts`, `kilo.ts`, `llmgateway.ts`, `mistral.ts`, `nvidia.ts`, `openai-compatible.ts`, `opencode.ts`, `openrouter.ts`, `perplexity.ts`, `sap-ai-core.ts`, `snowflake-cortex.ts`, `togetherai.ts`, `venice.ts`, `vercel.ts`, `xai.ts`, `zenmux.ts`, `cerebras.ts`, `alibaba.ts`
- `skill.ts` — Plugin skill hooks
- `skill/` — Skill templates (`customize-opencode.md`)
- `models-dev.ts` — Plugin models.dev catalog integration
- `variant.ts` — Plugin variant management

### `src/system-context/` — System context algebra and registry

- `index.ts` — System context main entry
- `registry.ts` — System context registry for context source registration
- `builtins.ts` — Built-in system contexts

### `src/skill/` — Skill discovery and guidance

- `discovery.ts` — Skill discovery: finds skill files in project and global locations
- `guidance.ts` — Skill guidance: resolves skill instructions for agents

### `src/flag/` — Feature flags

- `flag.ts` — Centralized feature flag definitions parsed from environment variables

### `src/installation/` — Installation metadata

- `version.ts` — `InstallationVersion`, `InstallationChannel`, `InstallationLocal` derived from build-time globals

### `src/id/` — Identifier generation

- `id.ts` — ID generation utilities

### `src/image/` — Image processing

- `photon.ts` — Image processing using Photon WASM library

### `src/observability/` — OpenTelemetry and logging

- `logging.ts` — OTLP logging setup and resource attributes
- `otlp.ts` — OTLP trace/span exporter configuration
- `shared.ts` — Shared observability types and conditional layer selection

### `src/oauth/` — OAuth

- `page.ts` — OAuth callback page rendering

### `src/permission/` — Permission system

- `saved.ts` — Persisted permission decisions
- `sql.ts` — Permission database schema

### `src/database/` — See above

### `src/filesystem/` — Filesystem services

- `search.ts` — Filesystem search implementation
- `watcher.ts` — Filesystem watcher service
- `ignore.ts` — Gitignore-style file filtering
- `protected.ts` — Protected file access controls
- `fff.bun.ts` — Bun-native filesystem operations
- `fff.node.ts` — Node.js filesystem operations

### `src/github-copilot/` — GitHub Copilot integration

- `copilot-provider.ts` — Copilot provider adapter
- `chat/` — Copilot chat completions API
- `responses/` — Copilot responses API
- `openai-compatible-error.ts` — OpenAI-compatible error handling

### `src/control-plane/` — Control plane

- `workspace.sql.ts` — Workspace database schema
- `move-session.ts` — Session relocation between workspaces

### `src/project/` — Project resolution and management

- `schema.ts` — Project schema types
- `sql.ts` — Project database schema
- `directories.ts` — Project directory resolution
- `copy.ts` — Project copy operations
- `copy-strategies.ts` — Strategies for project directory copying

### `src/integration/` — Third-party integrations

- `connection.ts` — Integration connection management

### `src/reference/` — Reference management

- External context reference types and resolution

### `src/share/` — Session sharing

- `sql.ts` — Share database schema

### `src/pty/` — Pseudo-terminal

- `schema.ts` — PTY schema definitions

### `src/ripgrep/` — Ripgrep integration

- `binary.ts` — Ripgrep binary path resolution

### `src/v2-schema.ts` — V2 schema exports

### `src/public-event-manifest.ts` — Public event manifest

### Root files

- `account.ts` / `account/` — Account types, errors, and database schema
- `agent.ts` — Agent service: manages agent definitions, permissions, models
- `aisdk.ts` — AI SDK integration for language models
- `background-job.ts` — Background job execution service
- `catalog.ts` — Catalog service: manages providers and models
- `command.ts` — Command service: manages slash commands
- `config.ts` — Configuration loading, merging, and validation
- `credential.ts` / `credential/` — Credential storage and retrieval
- `cross-spawn-spawner.ts` — Effect `ChildProcessSpawner` backed by `cross-spawn`
- `data-migration.sql.ts` — Data migration table schema
- `event.ts` / `event/` — Event bus (pub/sub) system and database schema
- `file-mutation.ts` — File mutation operations with locking
- `file.ts` — File-related type exports
- `filesystem.ts` — `AppFileSystem` service: findUp, glob, readJson, writeJson, ensureDir, etc.
- `fs-util.ts` — Filesystem utility functions
- `git.ts` — Git operations and repository management
- `global.ts` — Global application paths (data, cache, config, state, tmp) from XDG
- `image.ts` — Image processing service exports
- `instruction-context.ts` — Instruction context management
- `integration.ts` — Integration service for external services
- `location-mutation.ts` — Location-based mutation operations
- `location-service-map.ts` — Location service mapping
- `location-services.ts` — Location service composition
- `location.ts` — Location resolution and project binding
- `markdown.d.ts` — Markdown module type declarations
- `model.ts` — Model types and utilities
- `models-dev.ts` — Models.dev catalog integration
- `npm-config.ts` — `NpmConfig.load`: loads npm configuration via `@npmcli/config`
- `npm.ts` — `Npm` service: programmatic package installation via `@npmcli/arborist`
- `observability.ts` — Observability entry point (re-exports from `observability/`)
- `patch.ts` — Patch parsing and application
- `permission.ts` — Permission checking and request handling
- `plugin.ts` — Plugin loading and lifecycle exports
- `policy.ts` — Policy evaluation and enforcement
- `process.ts` — Process execution and streaming
- `project.ts` — Project resolution and directory management
- `provider.ts` — Provider types and utilities
- `pty.ts` — PTY session management
- `question.ts` — Question and answer service
- `reference.ts` — Reference management exports
- `repository-cache.ts` — Repository caching and cloning
- `repository.ts` — Repository parsing and validation
- `ripgrep.ts` — Ripgrep search adapter
- `schema.ts` — Common schema types and utilities
- `session.ts` — Session management exports
- `shell.ts` — Shell detection and configuration
- `skill.ts` — Skill discovery and loading exports
- `snapshot.ts` — Git-based snapshot operations
- `state.ts` — State management utilities
- `tool-output-store.ts` — Tool output truncation and storage
- `workspace.ts` — Workspace-related functionality
