# DeepSeek Harness Runtime and Preamble Seams

Last Updated: October 1, 2026

Read with [`overview.md`](overview.md). Sources below are relative to `<reference>/deepseek-harness/`.

## Agent and Session Identity

`ctx.agents` is the public service; `dsh-agent-loop` is its replaceable default driver. A live `Agent` exposes `id`, `session`, `ctx` (scoped registrations), inbox, `inject`, `followup`, and `steer`. The durable session header holds `cwd`; the agent loop registers a prompt variable for it via `context.agent?.session.header.cwd`. Fresh sessions may have no explicit cwd; inspect the host's effective workspace choice rather than blindly using the plugin process cwd. Session IDs identify live agents; resume reloads persisted history under the same ID. `agent/created` is an awaited serial event before queued work is released (sources include `startup`, `resume`, `clear`, `compact`); creation failure rolls back. `agent/disposed` occurs after the driver and scope unwind. A plugin mounted after agents already exist can enumerate `ctx.agents.list()` as well as listen for new ones. Creation/resume `setup` runs before publication and can attach scoped contributions.

Sources: `packages/core/agent/src/index.ts`, `src/runtime-types.ts`, `packages/core/agent-loop/src/index.ts`, `packages/context/file-reference-local/src/index.ts`.

## Prompt and Request Pipeline

`ctx.systemPrompt.section({ name, order, text, interpolate: false })` registers a disposable section; text may be a function of assembly context (`context.agent`, `context.scope`, `context.signal`). Sections sort by numeric order then name, scoped sections shadow globals. Default Harness identity is at −1000, persona prefix at 0, first-party tool guidance follows, and persona suffix is at 10200; external finite orders are allowed. `interpolate: false` matters for literal Operator prose containing `{{…}}`. A `complete: true` section replaces the whole assembled prompt (and multiple effective complete sections fail), so do not use it to casually overwrite Harness instructions. `system-prompt/assemble` is an async scope-filtered waterfall after section, context, variable and tool collection; a complete section is restored after the waterfall. `ctx.systemPrompt.context()` contributes sourced user-role runtime snapshots, not an ephemeral injection channel. `agent.inject()` queues model-visible input for a future step, does not wake an idle agent, and may miss an already claimed step; it is not a session-start transform.

On each step agent-loop assembles once, then runs `agent/pre-step`, then `step/start`, `agent/request`, adapter `prepareCall`, and prompt reconciliation. Only after preparation does it append admitted users, system nodes and request metadata; model history is derived from Session events. Retries reuse the same assembly, but a later step reassembles. For routes supporting `systemPromptUpdate: 'in-history'`, a changed nonempty prompt can append a later system node; otherwise it rewrites the first one, with logged empty replacements of old active nodes. Compaction can replace history; resume and fork use persisted session state. A runtime invariant requires model-visible requests to be reconstructable from the log. `llm/stream` is a streaming waterfall, not evidence of an accepted unlogged message transform; external hook-protocol bridges for other products are likewise not DeepSeek preamble injection hooks.

Sources: `packages/core/system-prompt/src/index.ts`, `README.md`, `packages/core/agent-loop/src/agent.ts`, `README.md`, `docs/architecture.md`, `docs/subsystems/system-prompt.md`.

## Consequences for Operator

Operator prefers one byte-stable render per session applied outside persisted history, but [`reference/implementation.md`](../../specs/reference/implementation.md) fully accepts persisted-context injection whether or not a model-boundary transform exists. DeepSeek's documented prompt and context seams persist model-visible contributions; this is acceptable, not a contract mismatch requiring separate approval. Do not pursue an unverified out-of-history seam solely to avoid persistence, or re-evaluate a section every step just to track Brain edits. Choose a supported lifecycle injection approach and verify its behavior on fresh sessions, resume, fork, compaction, and subagent start against the accepted persisted-context pathway. `agent/pre-step` and `agent.inject()` also persist inputs; an injection that runs before a request is not automatically equivalent to session-start context. A global static prompt section cannot resolve each session's project root and diagnostic independently. Render failure must never silently inject partial Brain content; unexpected failures must stop admission where feasible.

## Delegation Boundaries

In-process spawn creates a new session with inherited cwd and a fresh scope, not inherited parent registrations or transcript. In-process fork seeds only completed parent turns, including any logged system messages; it still creates a new scoped world. A global plugin contribution can reach local children when that plugin is composed; a per-agent cache needs explicit child identity handling. Continuable children can cold-resume. ACP, SDK, Codex, and Claude Code providers run other processes/runtimes and need independent Operator installation or an explicitly verified handoff; do not promise inheritance through the parent plugin.

Sources: `packages/subagent/subagent/README.md`, `subagent-spawn-in-process/README.md`, `subagent-fork-in-process/README.md`, `subagent-in-process-driver/README.md`.

## Existing Instruction Loader

Base-backed profiles mount `dsh-agent-instructions`: it finds `$DSH_HOME/AGENTS.md` and project `AGENTS.md` / `CLAUDE.md` plus local variants, by default from `.git` root to session cwd. It caps rendered baseline at 65,536 bytes, inserts durable user-role content at the first eligible pre-step, and refreshes after supported filesystem touches. `sdk-minimal` omits this loader. It does not load Operator partitions or implement immutable Operator preamble semantics; avoid mixing its source/authority model with the Operator Brain. Source: `packages/context/agent-instructions/README.md`, `apps/cli/reference/README.md`.
