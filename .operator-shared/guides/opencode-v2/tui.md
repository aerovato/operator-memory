# OpenCode V2 CLI (TUI) Plugin Development

Last Updated: September 24, 2026

Verified from https://opencode.ai/v2/docs/build/plugins/cli/ and `<reference>/opencode-v2/packages/plugin/src/tui/`. Replaces the V1 `tui.json` plugin layer and V1 `client.tui` APIs.

CLI plugins extend the terminal: commands, routes, slots, Markdown renderers, notifications, and local state. They run in the terminal client against the connected (possibly remote) server; the main server plugin is separate.

## Definition

```tsx
import { Plugin } from "@opencode/plugin/tui"

export default Plugin.define({
  id: "operator.cli",
  setup(context) {
    context.ui.toast.show({ message: "loaded", variant: "success" })
    return () => { /* cleanup */ }
  },
})
```

Import `@opencode/plugin/tui` directly; OpenCode resolves it at runtime so local plugins need no absolute path to a checkout. `usePlugin()` from the same package accesses the context inside JSX.

## Context

`setup(context)` receives `options`, `app` (`version`, `channel`), `location`, `client` (generated OpenCode client for the connected server), `data` (cached data APIs), `theme` (semantic tokens), `renderer` (OpenTUI), and `ui` APIs.

## Cached Data

`context.data.*` exposes sync/list/get/sync/invalidate caches: `session` (list/get/root/family/cost/status, `pending`, `message`, `permission`, `form`), `project` (+ saved permissions), `shell`, `location` (+ `vcs`), and `location.agent/command/integration/model/provider/reference/skill/mcp.server/mcp.resource`.

Events: `context.data.on("permission.asked", handler)` for one typed event, `context.data.listen(({ details }) => ...)` for all; both return unsubscribe functions.

## Status Icon Analog

V2 slots replace ad-hoc TUI plugin UI. Slot names include `app`, `home.footer`, `home.footer.status`, `prompt.footer`, `prompt.footer.status`, `prompt.footer.file`, `session.composer.top`, `session.panel`, `sidebar.content`, `sidebar.footer`:

```tsx
return context.ui.slot({
  append: "prompt.footer.status",
  render: () => <text fg={context.theme.text.default}>{statusText}</text>,
})
```

Placement verbs: `prepend`, `append`, `before`, `after`, `replace`.

## Commands and Keymaps

Register palette, slash, and keyboard commands in a reactive keymap layer:

```ts
context.keymap.layer(() => ({
  mode: "global",
  priority: 10,
  commands: [
    {
      id: "operator.status",
      title: "Operator status",
      group: "Operator",
      bind: "ctrl+g",
      palette: true,
      slash: { name: "operator", aliases: ["status"], arguments: true },
      run: async (input) => context.ui.toast.show({ message: input ?? "Ready" }),
    },
  ],
  bindings: ["operator.status"],
}))
```

`context.keymap` also offers `dispatch`, `shortcuts`, `commands`, `pending`, `active`, `mode.current/push`.

## UI APIs

- Toasts: `context.ui.toast.show({ title?, message?, variant: "info"|"success"|"warning"|"error", duration? })`.
- Dialogs: `ui.dialog.alert/confirm/prompt/select` promises and `ui.dialog.set/show/clear` for custom JSX.
- Router: `ui.router.register({ name, render })`, `current()`, `navigate({ type: "plugin" | "session" | "home", ... })`.
- Tabs: `ui.tabs.open/list/focus/close` when enabled.
- Attention: `context.attention.notify({ title, message, notification: { when }, sound: { name, volume, when } })` gated on terminal focus.
- Markdown: `context.markdown.registerCodeBlockRenderer(language, (token, render) => ...)` returns unregister.
- Formatting: `context.ui.format.path(path)` for display paths.

## Storage

- `context.storage.store("settings", { initial })` — durable JSON across restarts, synchronized across TUI instances; returns `[value, update]` with mutation callbacks.
- `context.storage.memory("state", { initial })` — survives plugin reloads, discarded on TUI exit.

## Publishing and Loading

Export `./tui` beside the main plugin entry; OpenCode loads it automatically for the terminal client. Add OpenTUI peers when rendering JSX:

```json
{
  "exports": { ".": "./src/index.ts", "./tui": "./src/tui.tsx" },
  "dependencies": { "@opencode/plugin": "^2.0.14" },
  "peerDependencies": { "@opentui/core": ">=0.5.10", "@opentui/solid": ">=0.5.10", "solid-js": ">=1.9.0" }
}
```

CLI-only plugins are configured in the single global `~/.config/opencode/cli.json` (`{ "plugins": ["..."] }`) and remain active when connected to a remote server. V2 replaces the V1 layered `tui.json(c)` files; project-local client configuration no longer exists.

For prebuilt TUI bundles, use `@opentui/solid/bun-plugin` in `Bun.build({ plugins: [...] })` to compile TSX with Solid reactivity. Plain Bun JSX compilation evaluates status text at mount, so changes only appear after remount. Keep Solid and OpenTUI external to share the host renderer.
