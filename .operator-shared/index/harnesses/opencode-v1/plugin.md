---
description: OpenCode plugin and SDK development reference
read_if: Researching OpenCode plugin types, hooks, SDK clients, tools, or integration patterns
---

# Plugin Development Index

## Guidelines

- Index all files and directories covered by this subindex.
- If a directory is large or low-value, only index the directory; do not list every file.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when files or layout in this area change.**

## Coverage

- `reference/opencode-v1/packages/plugin/`
- `reference/opencode-v1/packages/sdk/js/`

## Architecture

- Everything relevant to developing an OpenCode plugin: type definitions, V2 plugin system, SDK clients, hook system, tool registration, and reference implementations.

## OpenCode Plugin Development Index

### `packages/plugin` — @opencode-ai/plugin

Plugin type definitions and interfaces for extending OpenCode. Two generations: V1 (classic hooks) and V2 (Effect-based or Promise-based with richer domain hooks).

#### `src/` — V1 plugin types

- `index.ts` — Core plugin types: `Plugin`, `PluginInput`, `PluginContext`, `Hooks`, `AuthHook`, `ProviderHook`, `WorkspaceAdapter`, `WorkspaceTarget`, and all lifecycle hook signatures (chat, tool, shell, permission, compaction, etc.)
- `tool.ts` — `tool()` helper function using Zod schemas; `ToolContext`, `ToolResult`, `ToolAttachment`, `ToolDefinition` types
- `shell.ts` — `BunShell` interface, `BunShellPromise`, `ShellFunction`, `ShellExpression` for template-tag shell execution
- `tui.ts` — TUI plugin types: `TuiPlugin`, `TuiPluginApi`, route/dialog/prompt/theme/slot/workspace/keymap types
- `example.ts` — Example plugin registering a simple custom tool returning a greeting
- `example-workspace.ts` — Example workspace adapter plugin (`FolderWorkspacePlugin`) for folder-based workspaces

#### `src/v2/options.ts` — `PluginOptions` type (readonly record for plugin config)

#### `src/v2/effect/` — V2 Effect-based plugin system

- `index.ts` — Re-exports `PluginContext`, `Plugin`, `define` as main entry for Effect-based plugins
- `plugin.ts` — Core `Plugin<R>` interface, `define` function, `PluginDomain` for lifecycle management
- `context.ts` — `PluginContext` aggregating all hooks (agent, aisdk, catalog, command, integration, plugin, reference, skill)
- `registration.ts` — `Registration`, `Reload`, `Hooks<Spec>` types for hook registration
- `agent.ts` — `AgentDraft` interface, `AgentHooks` for transforming agent configs
- `aisdk.ts` — `AISDKHooks` for hooking AI SDK model/language-model initialization
- `catalog.ts` — `CatalogDraft`, `CatalogProviderRecord`, `CatalogHooks` for provider/model catalog transforms
- `command.ts` — `CommandDraft` interface, `CommandHooks` for command registrations
- `integration.ts` — `IntegrationDraft`, `IntegrationHooks`, `IntegrationMethodRegistration`, OAuth types
- `reference.ts` — `ReferenceDraft` interface, `ReferenceHooks` for local/git project references
- `skill.ts` — `SkillDraft` interface, `SkillHooks` for skill sources and transforms
- `event.ts` — `Event` interface, `EventMap` for subscribing to SDK event streams via Effect Streams
- `filesystem.ts` — `FileSystem` interface: `read`, `list`, `find`, `glob` methods using Effect
- `location.ts` — `Location` interface: directory and project directory paths
- `npm.ts` — `Npm` interface: `add` method for npm package installation
- `path.ts` — `Path` interface: standard system paths (home, data, cache, config, state, temp)

#### `src/v2/promise/` — V2 Promise-based plugin system

Mirrors `effect/` with Promise-based callbacks. Re-exports shared draft types from `effect/` counterparts.

- `index.ts` — Re-exports all Promise-based types and `define` as main entry
- `plugin.ts` — `Plugin` interface, `define` function, `PluginDomain` (Promise-based)
- `context.ts` — `PluginContext` aggregating hooks (Promise-based)
- `registration.ts` — `Registration`, `Reload`, `Hooks<Spec>` (Promise-based)
- `agent.ts`, `aisdk.ts`, `catalog.ts`, `command.ts`, `integration.ts`, `reference.ts`, `skill.ts` — Promise-based hook variants

### `packages/sdk/js` — @opencode-ai/sdk

Generated JavaScript SDK client. Two generations: V1 (legacy) and V2 (next-gen).

#### V1 (`src/`)

- `index.ts` — Exports `createOpencodeClient`, `createOpencodeServer`, `createOpencode` (boots server + client)
- `client.ts` — `createOpencodeClient(config?)`: creates HeyAPI client with `x-opencode-directory` header and error wrapping
- `server.ts` — `createOpencodeServer(options?)`: spawns `opencode serve`, parses listening URL, supports abort/timeout
- `process.ts` — `stop(proc)` and `bindAbort(proc, signal?, onAbort?)` for cross-platform process management (shared with V2)
- `error-interceptor.ts` — `wrapClientError`: converts non-Error response bodies into real Error objects
- `gen/sdk.gen.ts` — V1 generated SDK: `OpencodeClient` class with ~23 namespaces (`Global`, `Project`, `Pty`, `Config`, `Tool`, `Instance`, `Path`, `Vcs`, `Session`, `Command`, `Oauth`, `Provider`, `Find`, `File`, `App`, `Auth`, `Mcp`, `Lsp`, `Formatter`, `Control`, `Tui`, `Event`)
- `gen/types.gen.ts` — V1 generated request/response/data types
- `gen/client/` — HeyAPI HTTP client core (4 files)
- `gen/core/` — Core HTTP utilities (8 files: auth, serializers, SSE)

#### V2 (`src/v2/`)

- `index.ts` — Exports `createOpencodeClient`, `createOpencodeServer`, `createOpencode`, `data` namespace
- `client.ts` — `createOpencodeClient(config?)`: adds `experimental_workspaceID` and `x-opencode-workspace` header support
- `data.ts` — `data.message.user(input)`: constructs a `UserMessage` info object and associated `Part[]` array
- `server.ts` — `createOpencodeServer(options?)`: same structure as V1, imports shared `stop`/`bindAbort`
- `gen/sdk.gen.ts` — V2 generated SDK: `OpencodeClient` class with ~58 namespaces including new `Workspace`, `Experimental`, `ControlPlane`, `Location`, `Agent`, `Revert`, `History`, `Sync`, `Skill`, `Health`, `Resource`, `Adapter`, `Capabilities`, `Console`, `Diff`, `Worktree`, `ProjectCopy`, `Credential`, `Integration`
- `gen/types.gen.ts` — V2 generated types (13.6k lines); includes detailed `Event` discriminated union for session lifecycle (`EventSessionNext*` events)
- `gen/client/` — V2 HeyAPI client core (4 files)
- `gen/core/` — V2 core HTTP machinery including SSE and auth (8 files)

### Hook System Reference (Runtime)

- `packages/opencode/src/plugin/index.ts` — Plugin service: `trigger()` method, hook registration, plugin discovery and loading
- `packages/opencode/src/plugin/openai/codex.ts` — Example: `chat.params`, `provider` hooks (Codex OAuth)
- `packages/opencode/src/plugin/github-copilot/copilot.ts` — Example: `chat.headers`, `provider` hooks
- `packages/core/src/plugin/host.ts` — Plugin host: lifecycle management, hook triggering, plugin context construction

### Tool System Reference

- `packages/plugin/src/tool.ts` — `tool()` helper and types for defining custom tools
- `packages/opencode/src/tool/tool.ts` — Tool type definitions: `Def`, `Context`, `ExecuteResult` interfaces
- `packages/opencode/src/tool/registry.ts` — `ToolRegistry` service: aggregates all tools, resolves per agent/model
- `packages/core/src/tool/tool.ts` — Core tool type definitions (shared)
- `packages/core/src/tool/registry.ts` — Core tool registry

### Session & Message Types

- `packages/opencode/src/session/message-v2.ts` — `TextPart`, `ToolPart`, `CompactionPart`, `User`, `Assistant`, `Part` union, `synthetic` flag
- `packages/opencode/src/session/session.ts` — `fork()`, `messages()`, `updateMessage()`, `updatePart()`, `setTitle()`, `Info` type
- `packages/opencode/src/session/schema.ts` — `SessionID`, `MessageID`, `PartID` branded types
- `packages/core/src/session/message.ts` — Core message part types: `TextPart`, `ReasoningPart`, `ToolInvocationPart`, `SourceUrlPart`, `FilePart`, `StepStartPart`
- `packages/core/src/session/schema.ts` — Core session schema branded types

### TUI Slash Command Registration

- `packages/tui/src/app.tsx` — Global commands: `/sessions`, `/new`, `/workspaces`, `/models`, `/agents`, `/mcps`, `/variants`, `/connect`, `/status`, `/debug`, `/themes`, `/help`, `/exit`
- `packages/tui/src/routes/session/index.tsx` — Session-scoped commands including `/compact` (line 559)
- `packages/tui/src/component/prompt/index.tsx` — Prompt commands: `/editor`, `/skills`, `/warp`, `/move`
- `packages/tui/src/keymap.tsx` — Collects all commands, builds slash-name-to-display mapping
- `packages/tui/src/plugin/command-shim.ts` — Plugin-provided commands with slash support
- `packages/tui/src/component/prompt/autocomplete.tsx` — Slash command autocomplete UI

### Compaction Reference (LLM calling pattern)

- `packages/opencode/src/session/compaction.ts` — `buildPrompt()`, `processCompaction()`, `select()`: calls LLM via `SessionProcessor`
- `packages/core/src/session/compaction.ts` — Core compaction service
- `packages/opencode/src/session/processor.ts` — `SessionProcessor` service: drives the LLM loop
- `packages/core/src/session/runner/` — Session runner internals (LLM, max-steps, model, publish-llm-event, to-llm-message)

### Other Integration Packages

- `packages/slack` — Slack bot: bridges Slack threads to OpenCode sessions
- `packages/function` — Cloudflare Worker: session sync via Durable Objects, GitHub token exchange
- `packages/session-ui` — Web-focused React component library for rendering sessions (markdown, diffs, tool cards)
