# OpenCode Messaging Reference

Last Updated: September 15, 2026

Message and part behavior verified from `<reference>/opencode-v1/` source.

## Source Files

- `packages/opencode/src/session/message-v2.ts` — message/part storage, fetching, LLM conversion, compaction filtering, paging logic.
- `packages/opencode/src/session/session.ts` — session service: `messages()`, `fork()`, message and part operations.
- `packages/opencode/src/session/prompt.ts` — user message creation and assistant loop (`noReply` handling).
- `packages/core/src/session/sql.ts` — SQLite schema (`MessageTable`, `PartTable`, `SessionMessageTable`).

## Storage Model

OpenCode stores conversation data in SQLite via Drizzle ORM.

`MessageTable` (line 68):
- One row per message. Primary key: `id` (branded `MessageID`).
- `session_id` references `SessionTable` with `onDelete: cascade`.
- `data` column stores the full message JSON (`UserMessage` or `AssistantMessage`).
- Indexed on `(session_id, time_created, id)`.

`PartTable` (line 82):
- One row per part. Primary key: `id` (branded `PartID`).
- `message_id` references `MessageTable` with `onDelete: cascade` — parts are deleted when their message is deleted.
- `data` column stores the full part JSON.
- Indexed on `(message_id, id)` and `session_id`.

`SessionMessageTable` (line 119):
- V2 session message projection store. Used by the `/api/session/` endpoints.

## Legacy Session2 Messaging (`client.session`)

### Message Types

Messages are either user or assistant. Discriminated union on `role`.

User messages contain: `id`, `sessionID`, `role: "user"`, `time.created`, selected agent/model/tool settings, optional `system` and `format`.

Assistant messages contain: `id`, `sessionID`, `role: "assistant"`, `parentID` (pointing to the user message), model, agent, token, cost, finish, and error fields.

OpenCode does not require strict user/assistant alternation. One user request can produce multiple assistant messages during a tool loop.

### `session.messages({ sessionID })`

Returns `Array<{ info: Message, parts: Part[] }>`.

Without `limit`, messages are returned oldest-first (chronological order).

Source path (`Session.messages` at `session.ts:830`):
1. Pages through `MessageV2.page` with page size 50.
2. `MessageV2.page` queries SQLite newest-first (`desc(time_created), desc(id)`), then reverses each page to oldest-first.
3. Pages are accumulated from newest to oldest, with each page's items reversed again.
4. Final result is reversed once more to produce chronological order.

Do not reverse the result of no-limit `session.messages`.

With `limit`, `MessageV2.page` returns the newest page, ordered oldest-first within that page.

With `before` (cursor), returns the page before that cursor position.

### Part Types

Important part types:
- `text` — normal or synthetic text. `ignored: true` excludes from LLM conversion.
- `tool` — tool call state (`pending`, `running`, `completed`, `error`).
- `reasoning` — model reasoning text.
- `file` — attached file reference.
- `step-start` / `step-finish` — assistant step markers with snapshot.
- `snapshot` / `patch` — filesystem tracking.
- `agent` — agent reference.
- `retry` — retry attempt with error.
- `subtask` — subagent task.
- `compaction` — compaction marker with `auto`, `overflow`, and `tail_start_id`.

### Part Ordering

Parts are ordered by `PartTable.id` ascending (string comparison).

Source: `MessageV2.parts` at `message-v2.ts:499` — `.orderBy(PartTable.id)`.

Part IDs are generated using the `Identifier` namespace (`packages/core/src/util/identifier.ts`), producing ascending 26-char base62 IDs with embedded timestamps. Normal part IDs begin with `prt_` plus an ascending suffix.

### `part.update`

Upserts a part on an existing message. The full part object is written. To change a nested field, copy the existing part and replace the nested field deliberately. The parent message must already exist.

### `noReply` Messages

`session.prompt({ noReply: true })` persists a user message and skips assistant generation.

Source: `prompt.ts:1069` — `if (input.noReply === true) return message`. The function returns the user message immediately without calling `loop()`.

It does not queue parts for the next prompt. A later prompt creates another user message.

## LLM Conversion

When OpenCode converts stored messages to provider messages (`MessageV2.toModelMessage` at `message-v2.ts:200`):

- User `text` parts with `ignored: true` are excluded.
- Empty text parts are excluded.
- `text/plain` and `application/x-directory` file parts are converted to text.
- Other file parts are included as file attachments (or placeholder text when media is stripped).
- `compaction` parts on user messages are converted to text parts.

## Forking

`session.fork` copies stored messages and parts into a new session with new IDs.

Because IDs change, code mutating a fork must use the fork's message and part IDs.

## V2 Session Messaging (`client.v2.session`)

The V2 API uses a projected message model. Messages are `SessionMessage` — a discriminated union on `type` that includes `user`, `assistant`, `synthetic`, `system`, `shell`, `compaction`, `agent-switched`, and `model-switched`.

Assistant messages embed their content (text, reasoning, tool calls) directly in the `content` array, rather than using separate part rows.

### `v2.session.messages({ sessionID, limit?, order?, cursor? })`

Returns `{ data: SessionMessage[], cursor: { previous?, next? } }`.

Cursor-based pagination. `order` controls direction (`"asc"` = oldest first, `"desc"` = newest first).

### `v2.session.prompt({ sessionID, prompt?, delivery?, resume?, id? })`

Durably admits one session input. `delivery` controls promotion timing:
- `"steer"` (default) — promotes at next safe provider-turn boundary.
- `"queue"` — waits until session would otherwise become idle.

`resume: false` admits without scheduling execution.

### V2 Events

`v2.session.events({ sessionID, after? })` — SSE stream replaying durable events after a sequence, then continuing with new events.

`v2.session.history({ sessionID, limit?, after? })` — finite page of durable events.
