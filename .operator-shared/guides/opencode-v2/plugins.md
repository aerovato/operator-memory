# OpenCode Plugin Development

Last Updated: November 25, 2026

Verified from https://opencode.ai/v2/docs/build/plugins/ and `references/opencode-v2/` source. Hooks detail in [`hooks.md`](hooks.md), sessions and messaging in [`sessions.md`](sessions.md), TUI plugins in [`tui.md`](tui.md), installation and local development in [`installation.md`](installation.md).

This directory is the canonical OpenCode development guide, targeting V2. Its package names are `@opencode/plugin`, `@opencode/client`, and `@opencode/sdk`. For the frozen legacy adapter contract only, see [`../../specs/opencode/implementation.md`](../../specs/opencode/implementation.md).

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

Two parallel variants share the same interfaces: `@opencode/plugin` (Promise) and `@opencode/plugin/effect` (Effect). Effect plugin domains must extend the corresponding API client interface from `@opencode/client/effect/api` and only add plugin-context functions. Source: `references/opencode-v2/packages/plugin/src/promise/` and `effect/`.

`ctx` is essentially an OpenCode server client plus plugin-only methods (transforms, hooks, registrations, options). `ctx.location` carries `directory`, optional `workspaceID`, and `project` (`id`, `directory`, `canonical`) — the plugin instance's location, not the location of every session it observes. `ctx.options` holds values passed via the object config form.

## Loading and Configuration

- Local: direct `.ts`/`.js` files and immediate plugin package directories in every discovered `.opencode/plugins/` (V2 also still reads `.opencode/plugin/`; use `plugins/`). Global: same layout under `~/.config/opencode/plugins/`.
- Config `plugins` array accepts npm names, versions, scoped packages, relative/absolute paths, `file://` URLs, and `{ package, options }` objects.
- Config precedence (low to high): `~/.config/opencode/opencode.jsonc`, `./opencode.jsonc`, `./.opencode/opencode.jsonc`. Plugin arrays merge across applicable configs instead of replacing.
- Entries process in order; `-` prefix disables, `*` matches all, `.*` matches an ID prefix, a later ID re-enables.
- A `plugins/` directory beside a project-root `opencode.json(c)` is not auto-discovered; only `.opencode/plugins/` is.

Commands register through the `command` transform's `editor.add`. Transform callbacks are synchronous even in Promise plugins, so load external data before registering. Disposing a registration rebuilds from the rest; plugin unload disposes its registrations.

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

The executor receives the session, prompt attachments, and requested delivery mode (`"steer" | "queue"`).

## Other Context Methods

- `ctx.session` — create/get/context/prompt/generate/command/synthetic/switchAgent/switchModel/interrupt/rename/wait. See [`sessions.md`](sessions.md).
- `ctx.generate.text({ model, prompt })` — one-off model text without a session, tools, or history.
- `ctx.storage` — durable plugin-scoped JSON (`get`/`set`/`remove`/`scan` with prefix and cursor pagination).
- `ctx.event.subscribe({ signal })` — async iterable of public server events (`V2EventEncoded`). Abort the stream during cleanup.

## Preamble Injection Mapping

V2 has no message-array transform hook. The V2 surfaces relevant to Operator:

- `ctx.session.hook("context", ...)` can `event.system.push({ type: "text", text })` immediately before model dispatch. It is not persisted, reruns per agent model call (including tool continuations), and does not run for title, generate, or compaction requests. See [`hooks.md`](hooks.md).
- `ctx.session.hook("prompt", ...)` mutates admitted user prompts before durable inbox admission; edits become canonical persisted input — wrong tool for immutable preamble.
- V2 `AGENTS.md` instruction discovery (global `~/.config/opencode/AGENTS.md` plus ambient files from cwd up to home, stopping at the project root outside home) is config-layer, not plugin-controlled.

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

Pin a compatible stable V2 plugin API and test the installed package rather than only a workspace-linked copy. For TUI packages, externalize `solid-js` and `@opentui/*` from the build: inlining them creates a second renderer instance and causes `No renderer found` in UI slots.
