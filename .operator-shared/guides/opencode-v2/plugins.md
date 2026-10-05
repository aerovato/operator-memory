# OpenCode V2 Plugin Development

Last Updated: September 24, 2026

Verified from https://opencode.ai/v2/docs/build/plugins/ and `<reference>/opencode-v2/` source. Hooks detail in [`hooks.md`](hooks.md), sessions and messaging in [`sessions.md`](sessions.md), TUI plugins in [`tui.md`](tui.md), installation and local development in [`installation.md`](installation.md).

V2 is a breaking rewrite: V1 plugins do not work in V2. As of OpenCode 2.0.14 the V2 package names are `@opencode/plugin`, `@opencode/client`, and `@opencode/sdk`. The V1/V2 SDK naming in `../opencode-v1/` guides relates to OpenCode V1 only.

## Definition and Lifecycle

A plugin is a module with a `Plugin.define` default export:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "example",
  async setup(ctx) {
    await ctx.storage.set("loaded", true)
    return () => console.log("unloaded") // optional cleanup
  },
})
```

Two parallel variants share the same interfaces: `@opencode/plugin` (Promise) and `@opencode/plugin/effect` (Effect). Effect plugin domains must extend the corresponding API client interface from `@opencode/client/effect/api` and only add plugin-context functions. Source: `<reference>/opencode-v2/packages/plugin/src/promise/` and `effect/`.

`ctx` is essentially an OpenCode server client plus plugin-only methods (transforms, hooks, registrations, options). `ctx.location` carries `directory`, optional `workspaceID`, and `project` (`id`, `directory`, `canonical`) — the plugin instance's location, not the location of every session it observes. `ctx.options` holds values passed via the object config form.

## Loading and Configuration

- Local: direct `.ts`/`.js` files and immediate plugin package directories in every discovered `.opencode/plugins/` (V2 also still reads `.opencode/plugin/`; use `plugins/`). Global: same layout under `~/.config/opencode/plugins/`.
- Config `plugins` array accepts npm names, versions, scoped packages, relative/absolute paths, `file://` URLs, and `{ package, options }` objects.
- Config precedence (low to high): `~/.config/opencode/opencode.jsonc`, `./opencode.jsonc`, `./.opencode/opencode.jsonc`. Plugin arrays merge across applicable configs instead of replacing.
- Entries process in order; `-` prefix disables, `*` matches all, `.*` matches an ID prefix, a later ID re-enables.
- A `plugins/` directory beside a project-root `opencode.json(c)` is not auto-discovered; only `.opencode/plugins/` is.

## Transforms

Transforms are the central mutation pattern. Register on a domain; each transform builds on changes made by earlier plugins. Call `reload()` on the domain after external state captured by the transform changes; reload replays every active transform in registration order without rerunning plugin `setup`.

Domains with transforms: `agent` (list/get/default/update/remove), `provider` (source and settings), `model` (active models and default), `command` (`editor.add`), `integration` (+ auth methods), `mcp` (`editor.set/update/remove`, `disabled` reconciles lifecycle), `reference` (local and Git reference sources), `skill` (`editor.add` with inline `content` and `location`), `tool` (see below), `vcs` (custom VCS providers), `websearch` (providers, `default.set(false)` disables).

Tool registration specifics:

```ts
const registration = await ctx.tool.transform((draft) => {
  draft.namespace({ name: "acme", description: "..." })
  draft.add({
    name: "greeting",
    description: "...",
    input: { type: "object", properties: { /* ... */ }, required: [], additionalProperties: false },
    options: { namespace: "acme" },
    execute: async (input, tool) => {
      await tool.progress({ status: "..." })
      return { content: "result" }
    },
  })
})
```

- Transform callbacks are synchronous even in Promise plugins; load external data before registering or reloading.
- Effective names namespace as `acme_greeting` (dots and unsupported characters become `_`). Later valid registrations for the same effective name override earlier ones.
- `update`/`remove` use the effective name; updates preserve name/namespace and replace schemas/options wholesale.
- Disposing a registration removes its transform and rebuilds from the rest; plugin unload disposes its registrations.
- Each model request captures a tool snapshot; reload/disposal affect future snapshots only.

## Commands

```ts
await ctx.command.transform((editor) => {
  editor.add({
    name: "operator",
    description: "Operator command",
    execute: async ({ sessionID, prompt, delivery }) => {
      await ctx.session.prompt({ ...prompt, sessionID, text: `...`, delivery })
    },
  })
})
```

The executor receives the session, prompt attachments, and requested delivery mode (`"steer" | "queue"`). This replaces V1's config-hook command registration.

## Other Context Methods

- `ctx.session` — create/get/context/prompt/generate/command/synthetic/switchAgent/switchModel/interrupt/rename/wait. See [`sessions.md`](sessions.md).
- `ctx.permission` — `list`/`get`/`reply` on pending permission requests.
- `ctx.generate.text({ model, prompt })` — one-off model text without a session, tools, or history.
- `ctx.storage` — durable plugin-scoped JSON (`get`/`set`/`remove`/`scan` with prefix and cursor pagination).
- `ctx.event.subscribe({ signal })` — async iterable of public server events (`V2EventEncoded`). Abort the stream during cleanup.
- `ctx.integration`, `ctx.vcs`, `ctx.websearch` — see docs reference.

## Preamble Injection Mapping

The V1 adapter injected the preamble as an immutable synthetic first user message via `experimental.chat.messages.transform`. V2 has no message-array transform hook. The V2 surfaces relevant to Operator:

- `ctx.session.hook("context", ...)` can `event.system.push({ type: "text", text })` immediately before model dispatch. It is not persisted, reruns per agent model call (including tool continuations), and does not run for title, generate, or compaction requests — unlike the V1 immutable-first-message contract. See [`hooks.md`](hooks.md).
- `ctx.session.hook("prompt", ...)` mutates admitted user prompts before durable inbox admission; edits become canonical persisted input — wrong tool for immutable preamble.
- V2 `AGENTS.md` instruction discovery (global `~/.config/opencode/AGENTS.md` plus ambient files from cwd up to home, stopping at the project root outside home) is config-layer, not plugin-controlled.

Any V2 adapter design must decide whether per-model-call system injection satisfies the Operator preamble contract in [`preamble.md`](../../specs/preamble.md).

## Publishing

Package manifest with a `./rpc` export optional (shared RPC contract):

```json
{
  "name": "opencode-acme-plugin",
  "version": "1.0.0",
  "type": "module",
  "exports": { ".": "./src/index.ts", "./rpc": "./src/rpc.ts" },
  "dependencies": { "@opencode/plugin": "^2.0.14" }
}
```

Pin a compatible stable V2 plugin API and test the installed package rather than only a workspace-linked copy. Earlier Operator V2 releases imported the pre-release `@opencode-ai/plugin` runtime and failed under OpenCode 2.0.14 with `Cannot find package '@opencode-ai/plugin'`; the source now targets `@opencode/plugin`. For TUI packages, externalize `solid-js` and `@opentui/*` from the build: inlining them creates a second renderer instance and causes `No renderer found` in UI slots.
