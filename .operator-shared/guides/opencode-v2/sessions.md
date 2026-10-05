# OpenCode V2 Sessions and Messaging

Last Updated: September 15, 2026

Verified from https://opencode.ai/v2/docs/build/plugins/ and `<reference>/opencode-v2/` source. Replaces the V1 messaging model in `../opencode-v1/messaging.md`; the V1 SQLite part-row model (`MessageTable`/`PartTable`) does not apply to V2.

## Durable Session Core

V2 sessions are event-sourced with a projected message model. Behavior contracts live in `<reference>/opencode-v2/specs/v2/session.md` (prompt admission, execution, instructions, compaction, recovery) and `<reference>/opencode-v2/specs/v2/event-stream-architecture.md`. Runtime implementation: `<reference>/opencode-v2/packages/core/src/session/`.

## Projected Messages

Messages are `SessionMessage` — a discriminated union on `type` including `user`, `assistant`, `synthetic`, `system`, `shell`, `compaction`, `agent-switched`, and `model-switched`. Assistant messages embed content (text, reasoning, tool calls) directly in a `content` array rather than separate part rows.

## Plugin Session APIs

From plugin `setup(ctx)`:

- `ctx.session.create({ title? })` / `get({ sessionID })` / `context({ sessionID })` — active context messages after the last compaction.
- `ctx.session.prompt({ sessionID, text, ... })` — submit a user prompt. Command executors receive `prompt` attachments and `delivery` to forward.
- `ctx.session.generate({ sessionID, prompt })` — transient generation without adding to history; returns `{ text }`.
- `ctx.session.command({ sessionID, command, arguments })` — send a slash command.
- `ctx.session.synthetic({ sessionID, text })` — synthetic message injection (for example tool-style status text like "Deployment completed").
- `ctx.session.switchAgent` / `switchModel` — affect subsequent requests.
- `ctx.session.interrupt({ sessionID, continue: false })`, `rename`, `wait({ sessionID })`.

## Prompt Admission and Delivery

One durably admitted input per `prompt` call. `delivery` controls promotion:

- `"steer"` (default) — promotes at the next safe provider-turn boundary while the current drain requires continuation.
- `"queue"` — stays pending until the session would otherwise become idle.

`resume: false` admits without scheduling execution. Admission hooks run once at admission (see [`hooks.md`](hooks.md)); retrying an already-pending ID returns the original admission without rerunning hooks.

## Events

`ctx.event.subscribe({ signal })` yields the public server event stream (discriminated union on `type`, schema `V2EventEncoded`). Per-session durable event streams and finite history pages exist on the client tier (`session.events({ after })`, `session.history`) for replay after a sequence number.

## Runtime Constraints for Plugins

- Plugins cannot create arbitrary assistant messages. User-side injection uses `session.prompt`, `session.command`, or `session.synthetic`.
- Persisted edits to admitted prompts become canonical user input via the `prompt` hook; there is no hook to append immutable synthetic first messages as V1's `experimental.chat.messages.transform` allowed.
- Model-boundary modification (system, messages, tools) is per-call only through the `context` hook and is never persisted.
- Compaction is triggered via `session.compact` on the client tier; the `context` hook does not run for compaction requests.
