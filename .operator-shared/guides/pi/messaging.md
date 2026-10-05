# Pi Messaging and Injection Semantics

Last Updated: September 15, 2026

Verified from `<reference>/pi/packages/coding-agent/src/core/extensions/runner.ts`, `src/core/sdk.ts`, and `docs/session-format.md`. Extension authoring basics: [extensions.md](extensions.md).

## Session model

- Sessions are append-only trees of entries persisted as JSONL (`session-format.md`, version 3). `ctx.sessionManager` (`ReadonlySessionManager`) exposes entries; writes go through the API.
- Message entry kinds map to `AgentMessage` roles; `custom_message` entries become `CustomMessage` (role `"custom"`) and **do** participate in LLM context. `custom` entries (state) never enter context.
- Entry ids/parentIds form the tree; `fork`/`navigateTree` operate on it.

## `context` event — per-LLM-call message transform

- Wired as the agent's `transformContext` (`sdk.ts`): fires before **every provider call**, including every turn of a run and retries.
- `runner.emitContext` first `structuredClone`s the message list; the session file and agent state are never modified by handler mutations. Only the outgoing provider call sees the transformed list.
- Handlers chain in extension load order: each receives the previous handler's returned list; returning `{ messages }` replaces, returning nothing keeps the current list.
- **Invariant for immutable preamble injection**: prepend/insert on every call and keep it idempotent — the event refires constantly and nothing is persisted, so there is no "injected once" state to rely on.
- Errors in a handler discard that handler's result only.

## `before_agent_start` — per-prompt injection

- Fires once per user prompt before the agent loop; event carries raw `prompt`, `images`, assembled `systemPrompt`, and `systemPromptOptions` (`BuildSystemPromptOptions`, showing what Pi loaded).
- Result can return a `CustomMessage` (injected into the conversation) and/or `systemPrompt` (replaces the prompt for this turn; chained across extensions in load order).
- Unlike `context`, this does not refire per LLM call — suitable for once-per-prompt behavior, but injected messages land in the persisted session.

## Active injection APIs

- `pi.sendMessage({ customType, content, display, details }, { deliverAs, triggerTurn })` — appends a `CustomMessage` (LLM-visible). `deliverAs`: `"steer"` (default, after current tool batch), `"followUp"` (after agent settles), `"nextTurn"` (queued, no trigger). `triggerTurn: true` fires an LLM call when idle (steer/followUp only).
- `pi.sendUserMessage(content, { deliverAs, expandPromptTemplates })` — sends as the actual user; always triggers a turn; `deliverAs` required while streaming.
- `pi.appendEntry(customType, data)` — persists state entries excluded from LLM context; restore by scanning `ctx.sessionManager.getEntries()` on `session_start`.

## System prompt ownership

- The system prompt is assembled by `core/system-prompt.ts` from `BuildSystemPromptOptions`; context files (`AGENTS.override.md`/`AGENTS.md`/`CLAUDE.md`, ancestors plus global) are discovered by `core/resource-loader.ts`. Extensions should not rewrite these files; inject via `before_agent_start` `systemPrompt` or the `context` event instead.
- `ctx.getSystemPrompt()` reports Pi's prompt string, not the final serialized provider payload (`before_provider_request` rewrites are invisible to it).
