# Reference Implementation

Last Updated: October 5, 2026

The complete adapter specification: what every harness adapter must do, and what the reference implementation looks like. Concrete bindings in `implementation.md` documents measure themselves against the Reference Implementation section, not against one another. A binding may deviate only through the accepted pathways defined here or through an explicitly recorded deviation.

## Adapter Contract

What has to be done to implement a harness adapter.

### Package Boundary

- `@aerovato/operator-core` — load memory and render the preamble
- `@aerovato/operator-helper` — filesystem setup, status, guides, Git, index lint, install, and explicit upgrade
- `@aerovato/operator-<harness>` — harness hooks, preamble injection, command registration, optional status UI, and harness-native update when applicable

Session, command, and UI behavior belong in the adapter, not core.

### Required Surfaces

#### Preamble injection

- Resolve and inject the complete preamble for the active project root through one of the accepted pathways below
- Prefer rendering once per session and applying the preamble outside persisted history when that fits the harness. Persisting the preamble is fully acceptable; non-persistence is a preference, not an adapter requirement or a reason to block implementation.
- Give subagents the same preamble as main agents
- On load failure, inject the diagnostic preamble only; surface a human-visible recovery cue when the harness allows it

Composition, authority, warnings, and diagnostics are specified in [`preamble.md`](../preamble.md).

#### Commands

Expose these command intents on every supported harness. Prefer the following colon-based names, but similar host-compatible names are fully acceptable, including names with dashes instead of colons. Alternate names do not require an exception or separate approval:

- `/operator:user-init` — User Setup
- `/operator:project-init` — Project Setup
- `/operator:index` — Project Index Setup
- `/operator:repair` — memory load repair

Orchestration, helper sequencing, and agent handoff are specified in [`commands.md`](../commands.md). How a harness registers or runs a command, including its names, is adapter-specific.

#### Helper coordination

- Treat `operator-helper` as the install and deterministic coordination entrypoint
- Do not reimplement helper filesystem or guide logic inside the adapter
- Prefer agent-driven flows for complex setup; the harness only injects context and thin UI

### Optional Surfaces

- Status UI (readiness, partition presence) is optional sugar, not core behavior
- Native self-update is optional; helper installation remains the portable path

### Non-Goals

- Feature parity across harnesses
- Putting harness session or command APIs in core
- Special promote/unshare APIs; partition moves remain ordinary filesystem edits

## Reference Implementation

What a reference adapter would look like, derived primarily from the OpenCode V2 and Pi implementations. The pathways below are the accepted implementation shapes.

### Preamble Resolution

Before any injection, the adapter must obtain exactly one complete rendered preamble for the active project root. Two accepted pathways:

- Bundled core: the adapter imports `@aerovato/operator-core` in-process and renders memory directly. Preferred where the adapter runs in a trusted TypeScript/JavaScript runtime.
- Helper subprocess: the adapter runs `operator-helper preamble` with the event working directory and uses its stdout unchanged. Required where the adapter cannot import core (non-TypeScript runtimes, sandboxed or untrusted hook processes).

Both pathways produce identical output: the complete normal preamble or the canonical all-or-nothing load diagnostic. Successful Helper output is itself the memory-load diagnostic and requires no inspection. Never a partial Brain, never a fallback preamble.

### Preamble Injection

Required outcome: model calls carry the complete Operator preamble — normal or diagnostic — without partial Brain content. Both pathways below are fully acceptable. Prefer the transform pathway when it fits the harness, but do not treat persistence as a contract deviation or block an adapter over it. The transform pathway keeps one byte-stable render for the session; the persisted-context pathway may re-render at lifecycle boundaries:

- Transform pathway (preferred): an outgoing model-boundary context transform — a prepended synthetic user message or an appended system part — applied outside persisted history. It automatically reapplies after retries, tool turns, and compaction. Render lazily once per session, coalesce concurrent first renders, and cache the complete result so every call is byte-stable. Reference bindings: OpenCode V2, Pi.
- Persisted-context pathway (fully accepted): lifecycle-hook output persisted into the conversation as developer context at session start, after compaction, and at subagent start. Each event renders current memory again, so later renders can reflect Brain changes made mid-session. This remains acceptable even if a non-persisted seam also exists; choose the pathway that fits the harness. Reference binding: Codex.

Cross-cutting rules under both pathways:

- Subagents receive the same complete preamble as main agents, through the same mechanism where possible.
- `resume` and `fork` skip reinjection only when the retained history provably already carries the preamble; the transform pathway needs no such check because it reapplies automatically.
- Injected content is immutable for the session under the transform pathway; the persisted-context pathway trades that immutability for re-rendered currency and records this as an accepted consequence.

### Failure Semantics

- A rendered partition failure is successful canonical output: inject the diagnostic preamble, show one visible recovery cue per session when UI exists, and continue normal operation.
- An unexpected resolution failure must block the model call when the harness allows it (`ctx.abort`, hook `continue: false`). No fallback preamble reaches the model.
- Where blocking is impossible, typically delegated subagents, proceed without injection and surface the failure visibly.

### Commands

Register `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair` as dedicated commands that submit instructions to the agent in the current conversation. Preserve user-defined commands. Host-compatible slash names are acceptable; if command registration is unavailable, use user-selected skills (Codex). **The adapter must never execute Helper on behalf of the agent.**

Each registration supplies this prompt, substituting its command description, operation, and workflow instruction:

```text
# {command description}

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper {operation}`. {workflow instruction}

## Recovery

- If Helper cannot start, install or repair the npm package `@aerovato/operator-helper` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If `operator-helper {operation}` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
```

- `user init`, `project init`, `index init`: follow the corresponding emitted setup guide, including on operation failure.
- `memory check`: stop if clear; otherwise repair only reported load failures, recheck, then read applicable memory documents. Do not initialize absent partitions.

### Status UI

Optional. Where present: show active or ready state with `Local Build` or `vX.Y.Z` identity, an unavailable state for load diagnostics, and an error state for unexpected failures; emit at most one recovery cue per session; clear on shutdown. Absence of a status surface is acceptable.

### Installation And Updates

Helper owns installation and repair through `operator-helper install <harness>`. Prefer harness-native plugin update flows where they exist; the adapter never races or mutates the harness package store beyond its documented installation ownership.

### Runtime Shape

Adapters stay thin. Rendering through bundled core or the Helper subprocess are both accepted. Dependency-free out-of-process hook processes are acceptable where the harness spawns plugins as untrusted subprocesses; in-process plugin factories are the norm elsewhere. Session, command, and UI behavior stay in the adapter; shared behavior stays in core and Helper.

## Concrete Bindings

- OpenCode — [`opencode/implementation.md`](../opencode/implementation.md)
- OpenCode V2 — [`opencode-v2/implementation.md`](../opencode-v2/implementation.md)
- Pi — [`pi/implementation.md`](../pi/implementation.md)
- Codex — [`codex/implementation.md`](../codex/implementation.md)
- DeepSeek Harness — [`deepseek/implementation.md`](../deepseek/implementation.md)
- Claude Code — [`claude-code/implementation.md`](../claude-code/implementation.md)
- Kiro — [`kiro/implementation.md`](../kiro/implementation.md)
