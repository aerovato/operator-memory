---
description: OpenCode main application source map
read_if: Researching OpenCode sessions, agents, tools, plugins, CLI, or server behavior
---

# `packages/opencode` — Main Application

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `reference/opencode-v1/packages/opencode/`

## Architecture

- CLI and server application providing AI-powered coding assistance. Manages LLM sessions, tools, agents, projects, MCP servers, permissions, and more. Built with Effect, Drizzle ORM (SQLite), and the Vercel AI SDK. Many foundational types and services have been extracted to `packages/core`; this package provides the application-level implementations.
- See also [`core.md`](core.md) for the shared core layer and [`plugin.md`](plugin.md) for plugin development.

## `reference/opencode-v1/packages/opencode/` Index

### Session System

- `src/session/session.ts` — Session service (`Session.Service`): session CRUD, message history, cost tracking, title generation, `fork()`, `messages()`, `updateMessage()`, `updatePart()`, `setTitle()`, `Info` type
- `src/session/schema.ts` — `SessionID`, `MessageID`, `PartID` branded types
- `src/session/message.ts` — Message part types: `TextPart`, `ReasoningPart`, `ToolInvocationPart`, `SourceUrlPart`, `FilePart`, `StepStartPart`, `Info`
- `src/session/message-v2.ts` — V2 message implementation: `MessageV2` namespace, event handling, persistence, hydration
- `src/session/message-error.ts` — Error types: `OutputLengthError`, `AuthError`, shared error schemas
- `src/session/processor.ts` — `SessionProcessor` service: creates session run handles, manages tool execution, handles LLM streams, coordinates compaction
- `src/session/llm.ts` — `LLM` service: streams model requests with runtime selection (AI SDK vs native), auth, tool integration
- `src/session/llm/ai-sdk.ts` — AI SDK adapter: converts fullStream events to `LLMEvent`s with usage tracking
- `src/session/llm/native-request.ts` — Native LLM request adapter: converts session input to `LLMRequest` for `@opencode-ai/llm`
- `src/session/llm/native-runtime.ts` — Native runtime gate: selects native vs AI SDK execution, tool bridging
- `src/session/llm/request.ts` — LLM request preparation: system prompts, message transformation, tool schemas, provider options
- `src/session/llm/AGENTS.md` — Agent instructions for the LLM module
- `src/session/compaction.ts` — `SessionCompaction` service: manages message history overflow, prunes tool output, generates summaries
- `src/session/overflow.ts` — Overflow detection: checks token limits, determines when compaction is needed
- `src/session/retry.ts` — `SessionRetry`: automatic retry with model fallback on transient errors, rate limits
- `src/session/status.ts` — `SessionStatus` service: tracks and publishes session state (idle, busy)
- `src/session/summary.ts` — `SessionSummary` service: computes diffs, generates summaries, tracks file changes
- `src/session/revert.ts` — `SessionRevert` service: reverts to previous message states with snapshot restoration
- `src/session/run-state.ts` — `SessionRunState` service: manages session execution lifecycle, cancellation, busy state
- `src/session/reminders.ts` — Injects plan/build mode prompts and guidance based on agent state
- `src/session/instruction.ts` — `Instruction` service: resolves and attaches AGENTS.md/CLAUDE.md instructions
- `src/session/prompt.ts` — Session prompt orchestration: builds LLM requests, resolves tools, MCP integration
- `src/session/prompt/` — Provider-specific system prompt templates: `default.txt`, `anthropic.txt`, `gemini.txt`, `gpt.txt`, `codex.txt`, `copilot-gpt-5.txt`, `meta.txt`, `kimi.txt`, `trinity.txt`, `beast.txt`, `plan.txt`, `plan-mode.txt`, `plan-reminder-anthropic.txt`, `build-switch.txt`
- `src/session/tools.ts` — Session tool resolution: collects tools from registry, MCP, plugins; converts to AI SDK format
- `src/session/system.ts` — `SystemPrompt` service: environment context, skills list, MCP resources, provider-specific prompts
- `src/session/todo.ts` — `Todo` service: manages session todo lists with database persistence

### Agent System

- `src/agent/agent.ts` — `Agent` service: manages agent definitions (build, plan, general, explore, compaction, title, summary) with per-agent permissions, temperature, prompts; `get("compaction")` returns the compaction agent
- `src/agent/subagent-permissions.ts` — Subagent permission derivation: combines parent session permissions with subagent capabilities
- `src/agent/prompt/` — Agent prompt templates: `compaction.txt`, `explore.txt`, `summary.txt`, `title.txt`

### Plugin System

- `src/plugin/index.ts` — Plugin service: discovers, loads, manages external plugins; triggers lifecycle hooks (chat, tool, shell, permission, compaction); `trigger()` for hook execution
- `src/plugin/loader.ts` — `PluginLoader`: types for Plan, Resolved, Loaded, Missing; resolve function for loading plugins from npm or file paths
- `src/plugin/install.ts` — Plugin installation via npm, config file patching, manifest reading
- `src/plugin/meta.ts` — Plugin metadata storage and tracking: plugin state, themes, load statistics
- `src/plugin/shared.ts` — Shared plugin utilities: spec parsing, path resolution, source detection (file vs npm)
- `src/plugin/pty-environment.ts` — PTY environment layer connecting plugin shell hooks to session state
- `src/plugin/tui/internal.ts` — Internal TUI plugin utilities for built-in plugins with experimental event support
- `src/plugin/tui/runtime.ts` — TUI plugin runtime: loading, initialization, lifecycle, themes, command shims, plugin API
- `src/plugin/openai/codex.ts` — OpenAI Codex OAuth auth plugin: PKCE flow, device authorization, WebSocket connection pooling
- `src/plugin/openai/ws-pool.ts` — OpenAI WebSocket connection pool: reuse, fallback, retry
- `src/plugin/openai/ws.ts` — Low-level WebSocket protocol helpers: connect, header normalization, abort detection
- `src/plugin/github-copilot/copilot.ts` — GitHub Copilot OAuth auth plugin: device code flow, model fetching, enterprise support
- `src/plugin/github-copilot/models.ts` — Copilot models schema and fetching: pricing, capabilities, endpoint detection
- `src/plugin/azure.ts` — Azure API key auth plugin with resource name prompts
- `src/plugin/cloudflare.ts` — Cloudflare Workers AI and AI Gateway auth plugins
- `src/plugin/digitalocean.ts` — DigitalOcean OAuth auth plugin: implicit grant flow, router model detection
- `src/plugin/xai.ts` — xAI (Grok) OAuth auth plugin: device authorization grant, PKCE
- `src/plugin/snowflake-cortex.ts` — Snowflake Cortex OAuth auth plugin: role-based scopes, PKCE

### Tool System

- `src/tool/tool.ts` — Core tool type definitions: `Def`, `Context`, `ExecuteResult`, `Info` interfaces
- `src/tool/registry.ts` — `ToolRegistry` service: aggregates all tools (built-in + MCP + plugin), resolves per agent/model, builds AI SDK tool array
- `src/tool/schema.ts` — `ToolID` branded string with ascending ID generation
- `src/tool/json-schema.ts` — Converts Effect schemas to JSON Schema 7 for tool definitions
- `src/tool/truncate.ts` — Truncate service: manages large tool output with size limits, cleanup scheduling
- `src/tool/truncation-dir.ts` — Truncation directory path constant
- `src/tool/invalid.ts` — Invalid tool stub for handling argument errors
- `src/tool/external-directory.ts` — External directory permission checking for file operations outside workspace
- `src/tool/read.ts` — Read tool: reads files/directories with offset/limit, LSP diagnostics, image/PDF handling
- `src/tool/write.ts` — Write tool: creates/overwrites files with diff, LSP diagnostics, formatting
- `src/tool/edit.ts` — Edit tool: targeted string replacement with diff, line ending detection, file locking
- `src/tool/grep.ts` — Grep tool: regex content search using ripgrep
- `src/tool/glob.ts` — Glob tool: file pattern matching using ripgrep
- `src/tool/shell.ts` — Shell tool (bash, pwsh, cmd): command execution with permission detection, output truncation
- `src/tool/shell/id.ts` — Shell tool types: `ShellID`, `Kind` enum, `ToolID`
- `src/tool/shell/prompt.ts` — Shell tool parameter schema, prompt rendering, shell-specific notes
- `src/tool/websearch.ts` — Web search tool: Exa and Parallel providers with MCP integration
- `src/tool/mcp-websearch.ts` — MCP web search utilities for Exa and Parallel providers
- `src/tool/webfetch.ts` — Web fetch tool: URL content retrieval and conversion to text/markdown/HTML
- `src/tool/task.ts` — Task tool: spawns subagents with background/foreground modes
- `src/tool/plan.ts` — Plan tool: switches between plan and build agents
- `src/tool/question.ts` — Question tool: interactive user questions with prompt validation
- `src/tool/skill.ts` — Skill tool: loads and displays skill content
- `src/tool/lsp.ts` — LSP tool: definition, references, hover, symbols, hierarchy
- `src/tool/apply_patch.ts` — Apply patch tool: unified diff application with validation
- `src/tool/code-mode.ts` — Code mode tool: runs confined orchestration scripts with MCP tool access
- `src/tool/todo.ts` — Todo write tool: updates session todo lists

### TUI (separate package: `packages/tui`)

The TUI has been extracted to a separate package. Slash commands are registered across multiple files:

- `packages/tui/src/app.tsx` — Global commands: `/sessions`, `/new`, `/workspaces`, `/models`, `/agents`, `/mcps`, `/variants`, `/connect`, `/status`, `/debug`, `/themes`, `/help`, `/exit`
- `packages/tui/src/routes/session/index.tsx` — Session-scoped commands including `/compact` (line 559)
- `packages/tui/src/component/prompt/index.tsx` — Prompt commands: `/editor`, `/skills`, `/warp`, `/move`
- `packages/tui/src/keymap.tsx` — Collects commands, builds slash-name-to-display mapping
- `packages/tui/src/component/prompt/autocomplete.tsx` — Slash command autocomplete UI
- `packages/tui/src/plugin/command-shim.ts` — Plugin-provided commands

Legacy inline TUI remains in `packages/opencode/src/cli/cmd/run/` (~40 files with independent slash logic).

### CLI & Server

- `src/cli/` — CLI commands, bootstrap, yargs integration; `cmd/tui.ts` launches `@opencode-ai/tui`
- `src/server/` — HTTP server (Hono), routes, middleware, WebSocket, SSE
- `src/config/` — Configuration system: hierarchical JSON/JSONC config loading
- `src/storage/` — SQLite database, Drizzle ORM, migrations

### Other Modules (not plugin-relevant)

- `src/account/` — User account management (console/cloud login)
- `src/acp/` — Agent Client Protocol implementation
- `src/auth/` — Authentication credential storage
- `src/background/` — Background job management
- `src/bus/` — Event bus (pub/sub) system
- `src/command/` — Slash command system
- `src/control-plane/` — Workspace/control plane management
- `src/effect/` — Effect runtime and infrastructure
- `src/env/` — Environment variable management
- `src/event-v2-bridge.ts` — Bridges V1 events to V2 event system
- `src/format/` — Code formatting
- `src/git/` — Git operations
- `src/id/` — ID generation
- `src/ide/` — IDE detection and integration
- `src/image/` — Image processing
- `src/installation/` — Installation/update management
- `src/lsp/` — Language Server Protocol integration
- `src/mcp/` — Model Context Protocol integration
- `src/patch/` — Patch application
- `src/permission/` — Permission system
- `src/project/` — Project management
- `src/provider/` — LLM provider management
- `src/question/` — Interactive question system
- `src/share/` — Session sharing
- `src/skill/` — Skill system (prompt templates)
- `src/snapshot/` — File snapshot/diff system
- `src/sync/` — Event sourcing and sync
- `src/worktree/` — Git worktree management
