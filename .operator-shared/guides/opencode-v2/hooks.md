# OpenCode V2 Runtime Hooks

Last Updated: September 24, 2026

Verified from https://opencode.ai/v2/docs/build/plugins/ and `<reference>/opencode-v2/packages/plugin/src/promise/session.ts`. Replaces the V1 hook map in `../opencode-v1/v2-sdk.md`.

Register a hook on its domain and dispose the returned `Registration` when no longer needed. Multiple plugins can register the same hook; OpenCode runs them in plugin order and later hooks see earlier hooks' changes.

```ts
const registration = await ctx.session.hook("context", (event) => {})
await registration.dispose()
```

## Session Hooks

`ctx.session.hook(name, callback, options?)`. The optional third argument scopes to a provider (`{ providerID }`) for every hook except `"prompt"`.

### `prompt` — Prompt Admission

Intercepts incoming user prompts before attachment/skill resolution and durable inbox admission:

```ts
await ctx.session.hook("prompt", (event) => {
  event.prompt.text = event.prompt.text.replaceAll("secret", "[redacted]")
  event.prompt.files ??= []
  event.prompt.files.push({ uri: "file:///project/policy.md" })
  event.metadata = { ...event.metadata, source: "policy" }
  event.delivery = "queue"
})
```

- `prompt` holds `text`, `files`, agent mentions in `agents`, selected `skills`.
- `delivery` is `"steer"` by default, changeable to `"queue"`.
- Session and message IDs are readonly; a hook cannot redirect admission.
- Runs once during admission, not before every model call. Commands submitted through `session.prompt` run it; synthetic messages, shell messages, compaction, and move controls do not.
- Edits become the canonical persisted user input. Failed/interrupted preparation prevents admission.
- Not an exactly-once boundary: retrying an already-pending ID returns the original admission without rerunning hooks; concurrent submissions can run hooks more than once, first successful admission wins. No typed rejection API.

### `context` — Model Context

Modifies assembled system instructions, messages, tools, and generation settings immediately before model dispatch:

```ts
await ctx.session.hook("context", (event) => {
  event.system.push({ type: "text", text: "..." })
  delete event.tools.write
  event.options.temperature = 0.2
})
```

Source shape (`<reference>/opencode-v2/packages/plugin/src/promise/session.ts`, `SessionContext`): readonly `sessionID`, `agent`, `model` (`{ providerID, id, variant? }`); mutable `system: SystemPart[]`, `messages: Message[]`, `tools` map, and `options` (typed generation keys plus provider options).

Rules:

- Changes affect only the outgoing model call, not persisted history or configuration.
- Runs again for subsequent calls such as tool-driven continuations; separate `compaction`, `generate`, and `title` hooks handle those request kinds. `compaction` and `title` can set a result to skip the model call.
- `options` starts empty per call (these are request overrides, not resolved settings). Overrides beat model defaults, which beat route defaults.
- Provider options use semantic protocol names (for example `reasoningEffort` for OpenAI Responses) and merge recursively for objects; arrays and scalars replace.
- Deleting an override or setting `undefined` falls back to configured defaults.
- Built-in provider system prompts are themselves implemented this way (`<reference>/opencode-v2/packages/core/src/plugin/system-prompt.ts` rewrites `event.system[0]` when the agent has no custom system prompt).

### `model.request`

Modify request settings and optionally scope to one provider: `event.headers["x-plugin"] = "..."`, optional `baseURL`.

### `http.request` / `http.response`

Modify native provider `Request`/`Response`. Bodies are one-shot streams; clone or replace a body before reading it.

### `retry`

Override the retry decision for a provider failure after OpenCode classifies it: `event.decision = { retry: true, delay: 10_000 }`. `attempt` is the physical attempt (initial request is `1`). Built-in max attempts remain a hard limit; invalid delays fall back to the computed delay; context-overflow recovery is separate (it compacts instead of retrying).

## Permission Hooks

`ctx.permission.hook("evaluate", ...)` reviews decisions after configured rules, before the action runs or a prompt is published:

```ts
await ctx.permission.hook("evaluate", async (event) => {
  event.effect = "allow" | "ask" | "deny"
  event.message = "reason"
})
```

Runs for `allow` and `ask`; an explicit configured `deny` is final and skips the hook. `message` appears in an escalated request or becomes the denial reason. Read-only fields: `sessionID`, `agent`, `action`, `resources`, `metadata`, optional `source` (`{ type: "tool", messageID, id }`).

## Shell Hooks

`ctx.shell.hook("create.before", ...)` mutates `command`, `cwd`, `timeout`, `shell`, `env` before execution. Replaces V1's `shell.env` hook.

## Tool Hooks

- `ctx.tool.hook("execute.before", ...)` — inspect or replace tool `input` before execution (`event.tool` is the effective name).
- `ctx.tool.hook("execute.after", ...)` — inspect results (`event.status === "completed"`, mutable `event.result`) or failures (`"error"`, `event.error`).
