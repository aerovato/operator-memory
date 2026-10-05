# Pi Extensions

Last Updated: October 3, 2026

Verified from `<reference>/pi/packages/coding-agent/docs/extensions.md` and `<reference>/pi/packages/coding-agent/src/core/extensions/`.

## Model

- Pi has no plugin RPC layer. A plugin is an in-process TypeScript **extension**: a module with a default-export factory `export default function (pi: ExtensionAPI)` (async allowed; awaited before `session_start`).
- Loaded via jiti — plain `.ts`, no compilation. Imports available: `@earendil-works/pi-coding-agent` (types), `typebox` (schemas), `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, Node built-ins, and npm deps via a sibling `package.json`.
- Extensions run with full system permissions; project-local ones load only after project trust.

## Discovery and load order

- Global: `~/.pi/agent/extensions/*.ts` or `*/index.ts`.
- Project-local: `.pi/extensions/*.ts` or `*/index.ts` (trust-gated).
- Subdirectory with `package.json` containing a `"pi"` manifest field loads what it declares.
- Extra paths via `settings.json` `extensions` array; packages via `packages` array.
- Loader order: project-local before global (`loader.ts`). Command name collisions across extensions get numeric suffixes in load order (`/name:1`).
- `/reload` hot-reloads auto-discovered locations; `-e ./path.ts` is a one-off test load that does not reload.

## ExtensionAPI surface (types.ts)

- `on(event, handler)` — full event union; handler receives `(event, ctx: ExtensionContext)`.
- `registerTool(definition)` — TypeBox schema, `execute(toolCallId, params, signal, onUpdate, ctx)`, optional `renderCall`/`renderResult`, `promptSnippet`/`promptGuidelines` feed the default system prompt.
- `registerCommand(name, { description, getArgumentCompletions, handler(args, ctx: ExtensionCommandContext) })`.
- `registerShortcut(keyId, { handler })`, `registerFlag(name, { type, default })`, `getFlag(name)`.
- `sendMessage` / `sendUserMessage` / `appendEntry` — see [messaging.md](messaging.md).
- `registerMessageRenderer` / `registerEntryRenderer` / `registerMarkdownTransformer`.
- `registerProvider(name, { baseUrl, apiKey, api, models, oauth, streamSimple })` — queued during initial load, immediate afterwards.
- `exec(command, args, options)`, `setSessionName`, `setLabel`, `getActiveTools`/`setActiveTools`, `setModel`, `setThinkingLevel`.

## Context and UI

- `ctx.mode`: `"tui" | "rpc" | "json" | "print"` — guard terminal-only UI on `"tui"`. `ctx.hasUI` is true in tui and rpc modes.
- `ctx.ui`: `select`/`confirm`/`input`/`notify` dialogs, `setStatus(key, text)` footer status, `setWidget(key, lines|factory)`, `setFooter`/`setHeader` factories, `custom()` focused components, `setEditorText`/`pasteToEditor`, theme access.
- `ExtensionCommandContext` adds `waitForIdle`, `newSession`, `fork`, `switchSession`, `navigateTree`, `reload`, `getSystemPromptOptions` — command handlers only.
- `ExtensionCommandContext` does not expose message-send actions. A command handler sends through the factory-captured `pi.sendUserMessage`; if it must start a clean turn, call `await ctx.waitForIdle()` first.
- Session replacement (`newSession`/`fork`/`switchSession`) fires `session_shutdown` then `session_start`; background resources started at `session_start` must be closed there.

## Lifecycle event order

Startup: `project_trust` (global/CLI extensions only) → `session_start { reason: "startup" }` → `resources_discover`.

Per user prompt: `input` (can intercept/transform/handle; extension commands checked first) → `before_agent_start` → `agent_start` → per turn: `turn_start` → `context` → provider hooks (`before_provider_headers`, `before_provider_request`, `after_provider_response`) → message/tool events → `turn_end` → `agent_end` → `agent_settled`.

Provider hooks: `before_provider_headers` mutates headers in place (retries reuse headers, hook does not refire); `before_provider_request` can replace the serialized payload (system-prompt rewrites here are invisible to `ctx.getSystemPrompt()`).

## Handler errors

Throwing handlers are caught by the runner and reported via the internal error channel — one broken extension does not kill the loop, but its result for that event is discarded.
