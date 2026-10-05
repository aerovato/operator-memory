# Pi Adapter Implementation

Last Updated: October 2, 2026

How `@aerovato/operator-pi` binds the general adapter contract with first-class Pi support. Command meaning and setup workflows stay in [`commands.md`](../commands.md) and [`../reference/implementation.md`](../reference/implementation.md). Behavioral deviations are recorded against the reference implementation, not other bindings.

## Package

Published as the npm pi-package `@aerovato/operator-pi`. Its package manifest loads `dist/index.js`; the bundle includes `@aerovato/operator-core` and leaves Pi's five runtime packages as `"*"` peers.

Install and repair with:

```text
operator-helper install pi
```

Helper invokes `pi install npm:@aerovato/operator-pi`. The unversioned source participates in Pi's native package update flow. Local development registers the package root, either persistently as a local package source or per run with `-e packages/pi`; never register the npm package and local path together.

## Feature Parity

Pi provides the same required Operator surfaces as the reference adapter:

- Immutable core-rendered preamble injection on every outgoing model call
- Canonical all-or-nothing load diagnostic and visible recovery cue
- Main-agent and independently launched subagent preamble injection
- `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`
- Instruction-based command handoff and agent-driven repair workflow
- Harness status UI with local-build or package-version identity
- Helper-managed installation and harness-native package updates

## Preamble Injection

- One `context` handler prepends a synthetic user message to every outgoing model call. Pi clones context before handlers run, so the message is never persisted and automatically reapplies after retries, continuations, tool turns, and compaction.
- Rendering is lazy. One factory-local pending promise coalesces concurrent first calls, then the adapter caches the complete synthetic message including its timestamp so every call is byte-stable.
- A rendered partition failure is successful canonical output: the diagnostic message is cached and injected, the footer becomes `· Operator Unavailable`, and one recovery notification is shown when UI exists.
- An unexpected rendering failure is cached by the pending promise. Every affected context call invokes `ctx.abort()`, returns the unmodified messages, sets `· Operator Error`, and shows one failure notification. No fallback preamble reaches the model.
- `session_shutdown` clears factory-local state. Session replacement and `/reload` create a fresh extension runtime and therefore a new immutable preamble.
- Pi's installed global package loads in main and child processes regardless of project trust. Reference subagents launch independent Pi processes and receive Operator through that persistent registration.

## Commands

The extension registers all four Operator command names directly. Each handler:

1. Waits for the active turn to become idle.
2. Sends the agent instructions through `pi.sendUserMessage(prompt, { expandPromptTemplates: false })` to check Helper's version, upgrade when outdated, run the requested workflow operation, and handle failures directly.

The agent receives Helper results as tool output rather than framed command output.

## Status UI

When UI exists, `session_start` sets the `__operator` footer slot to ANSI-magenta `· Operator Active (Local Build)` or `· Operator Active (vX.Y.Z)`. Load diagnostics use error-colored `· Operator Unavailable`; unexpected render failures use error-colored `· Operator Error`. `session_shutdown` clears the slot.

Pi does not expose native package-update results through `ExtensionAPI`, so the footer does not duplicate Pi's update check.

## Native Updates

Pi checks mutable package sources asynchronously at interactive startup and displays its native update notification when a package update exists. Operator does not perform a package registry check or mutate Pi's shared package store. Users apply updates with `pi update --extensions`; local and version-pinned package sources remain under Pi's rules.


## Differences From Reference

Pathway selections: bundled-core resolution (bundled into the package with Pi's runtime packages as `"*"` peers), transform injection as a prepended synthetic user message, slash commands, footer status UI, and harness-native updates through Pi's startup notification and `pi update --extensions`. All are accepted reference pathways; there are no behavioral deviations.

## Pi Harness Notes

- Pi renames colliding extension commands with numeric suffixes such as `:1`. Operator registers its exact command names and leaves collision handling to the harness.
- Reference subagents are independent Pi child processes. Persistent global package-root or npm registration is inherited; temporary parent `-e` registration is not.
- Global package extensions load regardless of project trust. Project-local resources remain subject to Pi's trust rules.

## Verification

- Pi unit coverage verifies pending-render coalescing, stable synthetic messages, canonical diagnostics, fatal aborts, session reset, footer lifecycle, all four instruction-based commands, and duplicate-name behavior.
- Helper integration coverage verifies construction of `pi install npm:@aerovato/operator-pi` through a live child process.
- The built npm package contains only `dist`, package metadata, and its README; `operator-core` is bundled with no runtime package import.
- Pi 0.84.2 loads both the package root and built entry. The integration mechanism and differences were also verified against Pi 0.85.1 source.
- Release validation should repeat model-boundary faux-provider coverage for retries, compaction, session replacement, `/reload`, and independently spawned subagents, plus isolated installation after the npm version exists.
