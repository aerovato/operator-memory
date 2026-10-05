# Claude Code Mods

Last Updated: October 3, 2026

The in-process mod API (Claude Code v2.1.287+): a plugin whose behavior is a JavaScript/TypeScript hooks module. For Operator this is the transform pathway that avoids the settings-hook 10k context cap.

## Shape

```text
operator/
├── .claude-plugin/plugin.json
└── hooks/
    ├── hooks.json        # {"description": "...", "modules": ["./register.js"]}
    └── register.js
```

The module exports `register(on)`. Each `on(eventName, matcher?, handler)` registers a handler `($, e, next)` forming a middleware chain per event: `next(e)` observes or rewrites, returning without `next` answers the event. Matchers are objects comparing event fields (value, array, regex). Events are deeply frozen; rewrite by passing a copy to `next`. Register each event once per matcher.

Loader constraints (verified from the official docs and the built-in mod sources):

- Imports must be relative paths inside the plugin directory; the only allowed bare import is `claude-code` (types and a few helpers). Third-party code must be pre-bundled into plugin-local files. Node APIs are unavailable: the official type declarations explicitly say "no Node", and a v2.1.287 validation probe rejects `node:fs/promises` with "a hooks module imports its own files by relative path and \"claude-code\", nothing else". Bundling existing core cannot remove its dependency on host filesystem and path APIs; direct in-process loading would require a core I/O abstraction backed by `$.fs`, including semantic parity verification.
- All outside work goes through `$`: `$.process.run`, `$.ui`, `$.store`, `$.command`, model calls, timers
- Static-analysis rules enforced by `claude plugin validate`: event names as string literals, no shadowing `on`, no dynamic `import()`, ES modules only, `$` not destructured or reassigned, mods API calls written in full
- Helpers receiving `$` must be declared at module top level. Nested helpers inside `register` are rejected by the v2.1.287 analyzer, even when they contain full `$.process.run` call sites.
- Types: Claude Code writes per-version `.d.ts` files into `.claude-plugin/types/` when loading via `--plugin-dir`; the canonical declarations are `mods/types/claude-code.d.ts` in the official repo
- A local `tsconfig.json` extending `.claude-plugin/types/tsconfig.json` is a generated-types shim, not Operator's check configuration. Operator uses `tsconfig.check.json` and its structural API subset; do not commit the shim.

Consequence for Operator: the mod cannot import `@aerovato/operator-core` in-process; it renders through the Helper subprocess pathway (`$.process.run(['operator-helper', 'preamble'])`) and injects via prompt events, which have no documented size cap.

## Injection-relevant events

- `prompt.compose` — fires when the engine renders the system prompt; resolves to ordered sections a hook may append to. **Primary Operator seam**: append a stable `operator` section carrying the rendered preamble. The system prompt re-sends on every model call, so injection automatically reapplies after tool turns, retries, and compaction; byte-stable for the session by construction; no documented size cap (live-verified: fires before every model call across normal turns, `/clear`, and `/compact`; a 36k section renders intact)
- `prompt.section` — per named system-prompt section (`memory`, ...); answers cached by name for the session; `{ text: null }` removes one. This is where `CLAUDE.md`/`AGENTS.md` content lands
- `prompt.context` — fires once per conversation for the context blocks the first user message carries; persisted-context cadence (answer cached until `$.ui.invalidate` or a re-read at compaction/`/clear`)
- `prompt.submit` — per-prompt rewrite; `e.context` array appends Claude-only context (per-turn, wrong cadence for a preamble)
- `skill.prompt` — skill text
- Text from these hooks that changes between requests invalidates the prompt cache — render once per session and stay byte-stable
- `turn.step` — each model request (streaming; async generator via `yield* next(e)`); can redirect the model or observe usage
- `classic.<Event>` — every settings-hook event (e.g. `classic.SessionStart`) with the same JSON payload; a mod can absorb the settings-hook pathway in-process
- `session.start`, `session.end`, `session.compact`, `command.run`, `command.describe`, `tool.call`, `tool.check`, `plugin.register`

## Mods API (`$`)

`$.ui.log` (transcript line Claude does not read), `$.ui.ask`, `$.ui.invalidate`, `$.process.run`, `$.tool.register`, `$.session.version()`, model calls, timers, file access. A hook can only act outside its own code through `$`, which is what makes mods auditable (`claude plugin validate` lists events and calls).

For Operator: a mod renders the preamble by running `operator-helper preamble` through `$.process.run` (helper subprocess pathway — the loader forbids npm deps and Node builtins, so bundled core in-process is not available) and injects via `prompt.context`/`prompt.section` — uncapped, in-process registration, no stdin/stdout parsing beyond the subprocess itself.

## Failure, ordering, policy

- A failed hook (throw/timeout/bad shape) is skipped and the next handler runs; `.catch` on a registration answers in its place — the fail-closed pattern for guards, and for Operator the place to degrade to the diagnostic preamble
- Chain order: `sec-default` and org prepend mods first, then installed mods, then org append, then built-ins; among installed mods, dependencies run first. Settings `PreToolUse` hooks from non-managed files run after the last mod's `next` — a mod that answers without `next` keeps them from running
- `disableAllHooks` stops installed mods but leaves the rest of the plugin (skills, commands) loaded; org policy can restrict mods (`allowManagedModsOnly`)
- Mod hooks run across terminal, Desktop, VS Code, `claude -p`, SDK, and cloud sessions; drawing is terminal/Desktop only (irrelevant to Operator)

## Where mods run false

- Requires v2.1.287+; users on older Claude Code get nothing from a mod-based plugin unless the settings-hook pathway also ships
- A mod is user-privilege code inside Claude Code's process — some users and orgs will not install one; the marketplace trust review surfaces exactly what a mod does
- The API is newer and moves faster than settings hooks

## Testing

`claude plugin test mods/<name>` runs a mod's `tests/` against the real engine `$` and the mod's `on` chain; see `mods/diff/tests` and the mods README for the harness shape. Sample mods live in `anthropics/claude-code-playground` under `claude-code/mods`.

Live PTY verification notes (v2.1.287): the TUI swallows multi-character pty writes (paste detection) — type character-by-character and send `\r` separately; the folder-trust dialog needs a down-arrow before Enter; `claude plugin validate` and `-p` mode need no PTY.

## Binding direction (resolved)

Injection over persistence, via a mod: `prompt.compose` appends a stable `operator:<section>` system-prompt section (`scope: 'session'`) carrying the preamble, rendered once through a Helper subprocess (`$.process.run(['operator-helper', 'preamble'])`, whose wait does not count against the hook's 10s own-execution limit) and cached — the transform pathway, uncapped, outside history, byte-stable by construction, reapplied on every model call including after compaction and model switches.

Resolved open questions:

- Size: no documented cap on prompt section text (only UI `Text` children, `$.fs`, `$.store`, and hook/API time are limited)
- Model switches: `prompt.compose` re-renders per prompt with the active `model`; returning cached text stays stable and the engine places cache marks
- Subagents: **disproved for compose, solved via `agent.spawn` (live-verified v2.1.287)** — `prompt.compose` does not fire for subagent system prompts (foreground `Task` subagent cannot see compose-appended sections; background agents fire no compose). An `agent.spawn` hook may rewrite `prompt` (also `description`, `subagentType`, `model`, `cwd`) before the subagent's model resolves; prepending the preamble there reaches the subagent, uncapped, in-process. The rewrite is not visible to the parent (its transcript keeps the original tool-call parameters) and works cross-model. `classic.SubagentStart` `additionalContext` (10k per-string cap) is the recorded fallback
- Conversation boundaries: the mod `session.start` does not re-fire after `/clear`/`/resume`/`/branch`, so it is not a lazy-render trigger. `/clear` emits `session.end` with reason `clear` and creates a new session ID. Operator keeps its process-lifetime render cache unchanged across these boundaries.

Settings hooks are not used for injection; the version floor (v2.1.287+) and org-policy restrictions (`allowManagedModsOnly`, `disableAllHooks`, `--bare`, `--safe-mode`) are documented limitations, explained by `/operator:repair` and the harness guide.
