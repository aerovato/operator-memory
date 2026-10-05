---
description: Pi agent monorepo (earendil-works/pi) map focused on the coding-agent extension system; other packages lightly indexed
read_if: Porting the Operator plugin to Pi, researching Pi extensions, skills, commands, or preamble injection points, or navigating reference/pi packages. Guides with verified injection and packaging detail live in `../../../guides/pi/`.
---

# Pi Monorepo

## Coverage

- `reference/pi/` (shallow clone of `earendil-works/pi`, formerly `badlogic/pi-mono`)

## Architecture

- Pi agent toolkit monorepo: npm workspaces (not Bun), TypeScript, Biome, Vitest, `tsgo` typechecking.
- Build order encodes layering: `chord` → `tui` → `telemetry` → `ai` → `agent` → `session-backends/sqlite-node` → `protocol` → `client` → `server` → `coding-agent`.
- Repo `AGENTS.md` (auto-injected when reading files under `reference/pi/`) enforces strict repo rules: erasable-only TypeScript syntax, no inline imports, `npm run check` after code changes, never `npm run build`/`npm test` unless asked, `./test.sh` for non-e2e tests, explicit-path git staging only.

## Operator Port Injection Points

Pi has no plugin RPC layer; everything is an in-process TypeScript **extension**. Key facts for porting Operator:

- Extensions are TS modules loaded via jiti (no compilation). Default-export factory `export default function (pi: ExtensionAPI)`. Async factories are awaited before `session_start`.
- Discovery: `~/.pi/agent/extensions/*.ts` or `*/index.ts` (global), `.pi/extensions/` (project-local, requires project trust). Distributable as pi packages (`npm:`/`git:` specs in `settings.json` `packages`, `pi install`); package manifest uses a `"pi"` field in `package.json`. Additional paths via `settings.json` `extensions`.
- Preamble injection candidates, in preference order:
  - `context` event (`core/extensions/types.ts`): fired before **each LLM call** with a deep copy of messages; return `{ messages }`. Message-list mutation at the model boundary; must be idempotent per call since it refires on retries and every turn.
  - `before_agent_start`: fired per user prompt before the agent loop; can return a `CustomMessage` to inject and/or replace the `systemPrompt` for that turn (chained across extensions).
  - `pi.sendMessage({ customType, content, display }, { deliverAs, triggerTurn })`: custom messages participate in LLM context; `appendEntry` does not.
- System prompt itself: `core/system-prompt.ts` `buildSystemPrompt(BuildSystemPromptOptions)`; context files discovered by `core/resource-loader.ts` from `AGENTS.override.md`/`AGENTS.md`/`CLAUDE.md` candidates walking ancestors plus a global file. Operator should not fight this; inject via events instead.
- Commands: `pi.registerCommand(name, { description, handler(args, ctx: ExtensionCommandContext) })`; name collisions get numeric suffixes (`/name:1`). Commands bypass skill/template expansion. `ctx.ui.notify`, `ctx.ui.setStatus(key, text)` (footer status — analog of the OpenCode TUI status icon), widgets via `ctx.ui.setWidget`.
- Mode awareness: `ctx.mode` is `"tui" | "rpc" | "json" | "print"`; guard terminal-only UI. `ctx.hasUI` true in tui/rpc.
- Long-lived resources must not start in the factory; defer to `session_start`, close in `session_shutdown` (fires on quit, `/reload`, and session replacement).
- Config dir: `~/.pi/agent/` global; `~/.pi/` also holds skills, prompt templates, themes.

## `reference/pi/` Index

- `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md` — Repo agent rules, contributor gate, security policy.
- `README.md` — Package table and monorepo overview.
- Root configs and scripts — Ditto; note pinned-deps/entry-graph/shrinkwrap check scripts in `package.json`.
- `test.sh`, `mini-test.sh`, `pi-test.sh*` — Test runners (tmux TUI testing recipe lives in `AGENTS.md`).
- `tui-plan.md` — TUI planning notes.

### `packages/coding-agent/` — The coding agent CLI (plugin-dev focus)

- `docs/extensions.md` — **Canonical extension reference** (3000 lines): locations, lifecycle, every event, `ExtensionContext`/`ExtensionCommandContext`, all `ExtensionAPI` methods, custom tools, custom UI, state management. Read first when porting.
- `docs/packages.md` — Pi package manifest (`"pi"` field), `pi install`, npm/git distribution.
- `docs/skills.md`, `docs/prompt-templates.md`, `docs/themes.md`, `docs/settings.md` — Skills (SKILL.md-style), templates, themes, `settings.json` schema.
- `docs/session-format.md`, `docs/sessions.md` — Session tree/entries and message types (`CustomMessage`, `CustomEntry`) participating (or not) in LLM context.
- `docs/sdk.md`, `docs/rpc.md`, `docs/json.md` — SDK, RPC mode, JSON streaming mode.
- `docs/compaction.md`, `docs/security.md`, `docs/custom-provider.md`, `docs/development.md` — Compaction contract, threat model, providers, dev setup. Remaining docs are platform/setup guides (Ditto).
- `src/core/extensions/types.ts` — **Full extension API surface**: `ExtensionAPI`, `ExtensionContext`, `ExtensionUIContext`, all event/result types, `ToolDefinition`, `defineTool`. The port targets this file's types.
- `src/core/extensions/loader.ts` — Discovery/loading: project `.pi/extensions` then global `~/.pi/agent/extensions`; direct file, `index.ts`, or `package.json` `"pi"` manifest forms; jiti loading.
- `src/core/extensions/runner.ts` — Event dispatch, handler ordering, context event message replacement.
- `src/core/extensions/wrapper.ts`, `src/core/extensions/index.ts` — Extension wrapper and exports.
- `src/core/system-prompt.ts`, `src/core/resource-loader.ts` — System prompt assembly and context-file (AGENTS.md) discovery.
- `src/core/session-manager.ts` — Session tree persistence; `ReadonlySessionManager` is what extensions receive.
- `src/core/slash-commands.ts`, `src/core/skills.ts`, `src/core/prompt-templates.ts` — Command dispatch, skill/template loading and expansion.
- `src/core/tools/` — Built-in tools (bash, read, edit, write, grep, find, ls, powershell) plus `tool-definition-wrapper.ts` used to wrap built-ins.
- `src/core/pi-manifest.ts`, `src/core/package-manager.ts` — Pi package manifest parsing and `pi install` package management.
- `src/core/agent-session*.ts`, `src/core/event-bus.ts`, `src/core/compaction/` — Session runtime, event bus, compaction pipeline.
- `src/modes/` — Mode entrypoints: `interactive/` (TUI), `rpc/`, `print-mode.ts`, `json-event.ts`; each supplies its own `ExtensionUIContext` implementation.
- `src/cli/`, `src/client/`, `src/experimental/`, `src/utils/`, `src/extensions/llama/` — CLI arg parsing, API client, experimental features, utilities, bundled llama extension. Lightly relevant.
- `examples/extensions/` — Working extension examples (custom providers, sandbox, send-user-message); several are workspace packages with deps.
- `test/` — Vitest suites incl. `suite/` harness with faux provider (no real API keys).

### `packages/agent/` — `@earendil-works/pi-agent-core`

- Agent runtime: `agent-loop.ts`, `agent.ts`, `stream-fn.ts`, `types.ts` (`AgentMessage`, `AgentToolResult`, `ToolExecutionMode`). Relevant only for message/tool types the extension API re-exports.

### `packages/ai/` — `@earendil-works/pi-ai`

- Unified multi-provider LLM API; `types.ts` holds `TextContent`, `ImageContent`, `Usage`, `Provider`, `Model`. Extension events reference these types. `models.generated.ts` is generated — never edit directly.

### Other packages — lightly indexed

- `tui/` — Terminal UI library (`Component`, `TUI`, `OverlayHandle`, `AutocompleteProvider`) used by extension custom rendering.
- `telemetry/` — Vendor-neutral telemetry contracts and schemas.
- `chord/` — Application-composition runtime (services, replicated state, RPC, plugins); unrelated to extension authoring.
- `protocol/`, `client/`, `server/` — Wire protocol, client bindings, and server for programmatic Pi sessions.
- `session-backends/sqlite-node/` — SQLite session persistence backend.
- `evals/` — Evaluation harness for the coding agent.
