# OpenCode V2 Adapter Implementation

Last Updated: October 2, 2026

How `@aerovato/operator-opencode-v2` binds the general adapter contract. V2 is an incompatible plugin platform and therefore remains a separate package. Behavioral deviations are recorded against [`../reference/implementation.md`](../reference/implementation.md), not other bindings.

## Package

Install with:

```text
operator-helper install opencode-v2
```

The package exports server, RPC contract, and TUI entrypoints.

The TUI bundle must compile JSX with OpenTUI's Solid build transform and keep `solid-js`, `@opentui/solid`, and `@opentui/core` external so slot components share the terminal host's Solid owner and OpenTUI renderer. Ordinary JSX compilation evaluates dynamic status text only at mount; bundling a second renderer crashes slot rendering with `No renderer found`.

## Preamble Injection

- Load and render through core once per OpenCode `sessionID`, cache the complete normal or diagnostic result, and inject that same result into every model call for the session.
- Use V2's outgoing model-boundary `session.hook("context")`; context changes remain outside persisted history and reapply after compaction.
- Renderable partition failures inject the diagnostic preamble and show one recovery toast per session. Unexpected rendering failures show an error toast and abort the model call with the underlying cause.

## Commands

Register `operator:user-init`, `operator:project-init`, `operator:index`, and `operator:repair`. Each command admits instructions for the agent to check the Helper version, upgrade when outdated, run the corresponding workflow operation, and handle failures in the current conversation.

## TUI Status

- Show `Operator Connecting... (detail)` while the TUI verifies the active server plugin, `Operator Ready (detail)` after a successful status query, and `Operator Unavailable (detail)` after failure. Place this compact indicator in the built-in home footer status row; keep partition details in the session sidebar.
- Use `Local Build` for local packages and `vX.Y.Z` for installed packages.
- Show User, Private, and Shared as Checking, Loaded, Uninitialized, or Error in the session sidebar, with `/operator:repair` guidance when needed.
- Cache status per V2 location. Query the resolved location when the initial home screen receives it, and refresh after a top-level session transitions from active to idle. Ignore subagent idle transitions.
- Retry status after server reconnection. The server is authoritative because project memory may be remote from the TUI process.

## RPC And Notifications

The server registers one typed plugin RPC contract. Its `status` method loads the location-scoped memory status through core and returns the display detail plus partition states. Its `toast` event carries recovery and fatal preamble notifications to each connected TUI. The TUI validates event data before showing a 10-second native toast.

## Native Update

OpenCode 2 owns plugin update checks and installation through `opencode plugin check` and `opencode plugin update`. Operator does not mutate OpenCode's package cache or auto-update its own plugin. Helper's `install opencode-v2` remains the installation path.

## Differences From Reference

Pathway selections: bundled-core resolution, transform injection as an appended system text part, slash commands, status UI, and harness-native updates. All are accepted reference pathways; there are no behavioral deviations. The appended system part versus a prepended synthetic user message is a documented placement choice within the transform pathway.

## Harness Notes

1. Command handoff: V2's plugin command definition has only `execute`, so the adapter admits the instruction prompt through `session.prompt` without running Helper itself.
2. Client/server ownership: V2 may run remotely, so the server reads memory and exposes status plus toast events through typed RPC while the TUI renders client-local UI. RPC events are ephemeral when no TUI is connected.
3. Readiness lifecycle: the package TUI loads only after the server plugin is active. `Connecting` means the TUI is verifying RPC connectivity; a server setup failure prevents this package TUI from loading.
4. Local development: V2 has no package-identity dedupe and no per-source disabling — `-<plugin-id>` disables every source with that ID, and re-adding the same ID re-enables both sources, failing the second as a duplicate. The local preview build therefore uses a distinct dev ID (`OPERATOR_PLUGIN_ID=aerovato.operator-memory-dev`, via `bun run build:opencode-v2:dev`; `src/id.ts` holds the define fallback). `.opencode/opencode.json` disables the canonical ID and loads the dev-ID `dist`, so the global npm registration is suppressed in this project only. The supervisor reports duplicate active IDs as plugin failures without dropping the whole generation.
5. V2 uses `Plugin.define({ id, setup })`, receives `sessionID` directly on the context event, and uses the `home.footer` and `sidebar.content` slots. Stable V2 uses `@opencode/plugin` and requires the corresponding plugin API at runtime.
6. Command registration snapshots registered commands before adding its transform and skips matching names. Later definitions replace earlier ones, so user configuration remains authoritative.

## Verification Gaps

- Integration-test actual V2 loading, slash-command conversation behavior, tool continuation and compaction injection, subagent injection, reconnect status, and installation against a runnable stable harness.
- Add focused integration tests for actual Helper-unavailable commands and unexpected preamble rendering.
