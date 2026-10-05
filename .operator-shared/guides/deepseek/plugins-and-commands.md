# DeepSeek Harness Plugins and Commands

Last Updated: October 1, 2026

Read with [`overview.md`](overview.md). Sources below are relative to `<reference>/deepseek-harness/`.

## Cordis Host Plugin

A standard Host plugin is a function with `inject` and `apply(ctx, config)` exports or a Cordis `Service` subclass; required injected services delay activation until available. Registrations through `ctx.on` / `ctx.effect` unwind on unload and reload. An `agent/created` listener can perform awaited per-agent initialization before input runs; keep its work bounded and avoid waiting for the agent's idle state. A scoped registration through `agent.ctx` affects that agent; global registrations affect every matching agent. Waterfalls are around-middleware: an observing listener must call `next()`, or it stops downstream listeners. Include/profile row placement does not imply event ordering.

For a thin Operator Host plugin, `@aerovato/operator-core` can be imported in-process if Node package resolution works; `operator-helper` remains the owner of install, setup, status, guides, lint and repair. An adapter must not reuse the dynamic `cordis-host-runner` as an installation route: its definitions are transient, session-scoped and erased on restart.

Sources: `docs/cordis-primer.md`, `docs/cookbook/adding-a-package.md`, `packages/core/agent/src/runtime-types.ts`, `packages/extensions/cordis-host-runner/README.md`.

## Human Commands

`ctx.commands.register({ name, description, handler })` registers a direct human command. A command definition may include an input hint and `recordInput`; handlers receive `{ agent, rawInput, attachments, signal, commandId }` and return `{ kind: 'success', text? }` or `{ kind: 'error', text }`. `rawInput` includes whitespace following the name; parse it deliberately. `ctx.commands.execute(agent, line, attachments, signal)` is called by an interactive adapter; `list`/`find` support discovery. Registry execution logs `command/run` and `command/done`, but result text is UI-only, not agent working context. If a setup command should make the agent follow Helper output in the same conversation, it must explicitly schedule model-facing work through the agent's accepted input path (for example `agent.followup` or `agent.steer`, depending on turn behavior); those paths are durable. Check Helper availability before normal operations and frame injected command/output according to `../../specs/commands.md`. A returned success string alone does not run setup.

Command names match `^[a-z][a-z0-9_-]*$`; the parser stops at `:`, so `/operator:*` names cannot be registered verbatim. Operator's colon namespace is preferred, not mandatory: [`reference/implementation.md`](../../specs/reference/implementation.md) accepts alternate hyphenated slash names. Use `/operator-user-init`, `/operator-project-init`, `/operator-index`, and `/operator-repair` for the same four workflow intents; changing the host command grammar is unnecessary. Unknown slash commands are rejected by shipped adapters rather than submitted to the model. A plugin can register a command only when `commands` is present (e.g. via `ctx.inject(['commands'], ...)`); some noninteractive compositions do not provide that surface. Command execution cancellation ends waiting, not necessarily external side effects of an uncooperative handler.

Sources: `packages/interaction/commands/src/index.ts`, `README.md`, `docs/subsystems/commands.md`, `packages/plan/plan-mode/src/index.ts`.

## Surface Matrix and Limits

Web has a client-side command UI (`ui-commands`) over the Host registry; an installed interactive CLI adapter can also consume human commands, but the shipped `dsh` command is a profile launcher rather than an interactive chat UI. Headless one-shot tasks, ACP automation, and UI-less SDK paths do not imply a slash-command UI, even if the Host plugin runs. Agent-facing skill registry and model tools are distinct from human commands and are not drop-in replacements for command registration. For an availability-only Web indicator, the package can export a `./client` module registered through `window.__ModuleLoader__`, declare `dsh.client.platform: web`, and inject `conversation.composer.dock` under its own list id; the existing composer renders that slot beside its other readings. This does not require Host state transport, but it cannot certify memory loading. A load-aware status would require a Host-to-Client state path. No universal status indicator exists across profiles. Keep helper-command availability and preamble injection independent of optional UI.

Sources: `packages/interaction/commands/README.md`, `packages/bundle/web-app/cordis.patch.yml`, `packages/preset/agent-preset/skills/cordis-plugin-development/templates/decoration/`, `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx`, `packages/client/ui-chat/src/client/apply.ts`, `docs/subsystems/skills.md`, `docs/subsystems/extensions.md`, `docs/architecture.md`.
