# Claude Code Injection

Last Updated: October 2, 2026

Context-injection surfaces relevant to Operator's preamble, ranked by fit. All details from live docs (October 2026) unless noted.

## SessionStart (primary hook pathway)

A `SessionStart` command hook is the canonical injection point. Fires per session and re-fires on lifecycle boundaries via matcher:

- `startup`, `resume` (`--resume`, `--continue`, `/resume`), `clear` (`/clear`), `compact` (auto or manual), `fork`

This matches Operator's persisted-context pathway exactly: render current memory at each event, so later renders reflect mid-session Brain changes. Register matchers explicitly or omit the matcher to fire on every source; `compact` coverage replaces a `PostCompact` hook.

Behavior:

- Only `type: "command"` and `type: "mcp_tool"` handlers are supported; `mcp_tool` handlers are skipped at launch because MCP servers are not up yet — use `command`
- Plain stdout (exit 0, non-JSON) is added to Claude's context; JSON `hookSpecificOutput.additionalContext` is the structured form. Both are wrapped in a system reminder and inserted before the first prompt
- `initialUserMessage` creates the first user turn instead (only meaningful in `-p` mode)
- At interactive startup, resume, and `/clear`, hooks run in the background; the first model response still waits for them. Mid-session `/resume` blocks until they finish
- Input carries `source`, optional `model`, `agent_type`, and on `resume`/`fork` transcript freshness fields (`context_tokens`, `prompt_cache_likely_expired`, ...)
- **No blocking**: SessionStart is context-only. Exit 2 does not block the session; a failed hook just contributes no context. Unexpected-failure blocking must therefore live elsewhere (see failure semantics below)

### The 10,000-character cap

`additionalContext`, `systemMessage`, `initialUserMessage`, and plain stdout are each capped at 10,000 characters. Over the limit, Claude Code replaces the string with a file path plus a 2,000-character preview, and does not ask Claude to read the file. There is no setting to raise it.

This is the central sizing constraint for the Claude Code binding: a full Operator preamble with instructions, catalogs, and indexes can exceed 10k characters. Options, in the order to evaluate:

- Emit the diagnostic preamble or a compact pointer that fits, and have the full Brain loaded through the command surface — measures against "complete preamble" and likely insufficient alone
- Use the mod `prompt.context`/`prompt.section` events, which have no documented cap (see [`mods.md`](./mods.md))
- Multiple hooks each contributing up to 10k — each string is measured separately and all values reach Claude; splitting the preamble across a few well-bounded sections is viable but must stay byte-stable per render

Measure the rendered preamble size before choosing; record the decision in the binding spec.

## SubagentStart

Same `additionalContext` mechanism, injected before the subagent's first prompt. Matcher filters on agent type (`general-purpose`, `Explore`, plugin-scoped names like `^my-plugin:reviewer$` — anchor regex matchers because the colon switches to the regex path). For the mod-based binding this is the **fallback** seam only — the primary subagent mechanism is the mod `agent.spawn` prompt rewrite (see [`mods.md`](./mods.md)).

Dedupe behavior aligns with Operator's session-immutability preference: when the hook runs again for the same subagent, Claude Code injects only if the subagent's context does not already hold an earlier copy, preserving the prompt cache; after auto-compaction discards the copy, the next render is injected again.

## UserPromptSubmit

`additionalContext` alongside every submitted prompt. Per-prompt rendering would violate byte-stability and bloat every turn; not suitable as the primary seam. Useful only for narrow, per-turn diagnostics. Note the lowered default timeout (30s) and that output is discarded on timeout while the prompt still proceeds.

## InstructionsLoaded

Fires when `CLAUDE.md` or `.claude/rules/*.md` loads. Observability only: hooks cannot block or modify instruction loading, and JSON output is discarded. Not an injection seam.

## Mod prompt events (verified from `mods/types/claude-code.d.ts` and the mods reference)

- `prompt.context` — fires once per conversation, when the engine computes the context blocks the first user message carries; blocks are persisted conversation context. The answer is cached until `$.ui.invalidate("prompt.context")` or a re-read (compaction, `/clear`), which re-fires it — persisted-context cadence with engine-managed reapplication
- `prompt.section` — fires once per named system-prompt section; answers cached by name for the session; unstable answers spend the prompt cache on every call
- `prompt.compose` — fires whenever the engine renders a system prompt ("the call the engine makes for every prompt it sends"); resolves to ordered `sections` (`intro`, `tools`, `memory`, ...); hooks may append sections, and the engine places each cache mark. Appending a stable section is the transform pathway: re-sent on every model call, outside history, byte-stable per session. Plugin-added sections are named `<plugin>:<name>`; each section carries a `scope` of `shared` (cross-person cacheable) or `session` — Operator's preamble is per-person/per-project and must use `session`
- No documented size cap on section text. The mods limits table caps hook time (10s own execution, excluding time inside mods API calls such as `$.process.run`, which itself allows 30s default / 10min max), UI `Text` children (10k), and `$.fs` (4 MiB) — nothing for prompt sections. Live-verified: a 36,009-character `session`-scoped section arrived fully intact, quoted verbatim from deep inside, no truncation
- Model switches re-render through `prompt.compose` with a different `model` field; returning the same cached text keeps the section stable. Cadence across normal turns, `/clear`, and `/compact` is live-verified — compose fired before every model call in every state; a model switch invalidates the cache anyway, so cross-model stability is moot
- Subagent coverage of `prompt.compose`: **live-disproved (v2.1.287)** — subagent system prompts are assembled from the agent definition, not the session compose pipeline. A foreground `Task` subagent cannot see compose-appended sections; background agents fire no compose at all; `PromptComposeInput` carries no `agentId`. Subagent injection uses the mod `agent.spawn` prompt rewrite (see [`mods.md`](./mods.md)); `SubagentStart` `additionalContext` is the recorded fallback
- The mod event `session.start` (not `classic.SessionStart`) fires once per loaded mod and does **not** re-fire after `/clear`, `/resume`, or `/branch` — do not use it as a render trigger. Live note: `/clear` emits `session.end` with reason `clear` and the next compose carries a **new** session ID; a process-lifetime render cache stays byte-stable across it regardless

## Instruction files

`CLAUDE.md` (project and user) is the static instruction channel; the `agents-md` built-in mod can load `AGENTS.md` instead or beside it. Operator must not write its preamble into `CLAUDE.md` — the Brain is dynamic and Operator owns rendering — but should document `CLAUDE.md` interplay (authority ordering with injected preamble) in the binding spec.

## Failure semantics

- Rendered partition failure: the Helper subprocess pathway returns the canonical diagnostic preamble; it is successful output and injects normally. One visible recovery cue per session via `systemMessage` (shown to the user, not persisted as chat)
- Unexpected resolution failure: SessionStart cannot block. A command hook that crashes or exits non-zero simply contributes nothing (non-blocking error). Acceptable degraded behavior per the reference implementation ("where blocking is impossible, proceed without injection and surface the failure visibly") — emit `systemMessage` with the failure and exit 0, and record this as the binding's accepted consequence

## Environment and paths

- `${CLAUDE_PROJECT_DIR}` — project root where the session started; stays put when Claude enters a worktree
- `cwd` in hook input follows Claude into worktrees and `cd`; use it as the event working directory for preamble rendering, not `CLAUDE_PROJECT_DIR` alone
- `${CLAUDE_PLUGIN_ROOT}` — the plugin's install directory; changes across plugin updates, so do not persist state there
- `${CLAUDE_PLUGIN_DATA}` — persistent per-plugin data directory that survives updates
- `CLAUDE_ENV_FILE` (SessionStart only) — append `export` lines to persist environment variables for later Bash commands
- Hooks run with Claude Code's environment; no controlling terminal (use `terminalSequence` JSON field for notifications)

## Byte stability and caching

SessionStart context is injected once per event occurrence; subagent context is copy-once per subagent. Text that changes between requests invalidates the prompt cache — render lazily once per event, never per turn, and never mix time-varying content (timestamps) into the preamble.
