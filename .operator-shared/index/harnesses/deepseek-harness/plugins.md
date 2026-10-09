---
description: DeepSeek Harness Cordis extension, human command, skill, hook, subagent, and agent-preset source map
read_if: Implementing a DeepSeek Harness plugin, setup command, agent-scoped registration, delegated-agent integration, or plugin lifecycle
---

# DeepSeek Harness Plugins

## Coverage

- `reference/deepseek-harness/packages/interaction/`, `packages/hooks/`, `packages/skill/`, `packages/subagent/`, `packages/extensions/`, `packages/preset/`, `packages/mcp/`
- Related Cordis authoring references under `reference/deepseek-harness/docs/`

## Architecture

- Cordis plugins declare services they inject, then register listeners and resources as disposable effects. Waterfall events are around-middleware; returning without `next()` stops downstream listeners.
- Interactive commands operate in a direct UI channel; model-facing tools and skills are separate registrations. Native hooks are ordinary Cordis listeners; bridge packages translate external hook protocols.
- Subagents use a provider registry and distinct in-process/fork/remote implementations. Agent presets compose per-session plugin trees, rather than changing the global profile.
- `extensions/` is the harness's agent-authored dynamic plugin facility; it is not the only route for installing a conventional Cordis plugin.

## `reference/deepseek-harness/packages/interaction/` Index

- `README.md` — Human interaction package map.

### `commands/` — Human slash-command registry

- `src/index.ts`, `src/types.ts` — Command parsing, registration, scoped shadowing, execution, and result types.
- `src/brand.ts`, `src/invariant.ts` — Stable identifiers and lifecycle pairing checks.
- `README.md` — Syntax, UI dispatch, and command authoring reference.

### Other interaction packages

- `permission-presets/` — Session permission choices.
- `user-approval/`, `user-questions/`, `tool-ask-user/` — Approval and human question services and tool.

## `reference/deepseek-harness/packages/hooks/` Index

- `hook-protocol/src/` — Shared external hook wire types, matching, dispatch, and runner; large package.
- `hooks-claude-code/`, `hooks-codex/` — Host-side adapters for external hook configurations.

## `reference/deepseek-harness/packages/skill/` Index

- `skill/`, `skill-filesystem/` — Skill registry and filesystem provider.
- `tool-skill/`, `tool-workspace-dependencies/` — Model-facing skill invocation and workspace dependency guidance.
- `skill-office/`, `skill-badge/` — Specialized skill content and presentation.

## `reference/deepseek-harness/packages/subagent/` Index

- `subagent/src/` — Provider contract, child identity, continuation lifecycle, catalog, and client views; large package.
- `subagent-spawn-in-process/`, `subagent-fork-in-process/`, `subagent-in-process-driver/` — Local child creation and execution.
- `subagent-acp/`, `subagent-dsh-sdk/`, `subagent-codex/`, `subagent-claude-code/` — Out-of-process delegated-agent providers.
- `tool-subagent/`, `tool-subagent-control/` — Model-facing delegation and child management.

## `reference/deepseek-harness/packages/extensions/` Index

- `cordis-host-runner/src/` — Dynamic Host plugin definitions, activation lifecycle, registry, and runtime inspection.
- `cordis-client-runner/src/`, `ui-cordis/src/` — Browser-side dynamic plugin activation and UI.
- `tool-cordis/src/` — Model-facing dynamic plugin controls and inspection.

## `reference/deepseek-harness/packages/preset/` Index

- `agent-preset-registry/src/` — Preset definitions, per-agent composition, scope mounting, and session selection.
- `agent-preset/` — Shipped agent preset configurations and reusable skills.
- `persona/` — Persona contributions.

## `reference/deepseek-harness/packages/mcp/` Index

- `mcp-client/src/`, `mcp-resources/src/` — MCP tool transport and resource integration.

## `reference/deepseek-harness/docs/` Index — Plugin authoring references

- `cordis-primer.md`, `cordis-tutorial/` — Framework service injection, events, waterfall, loader, and effects.
- `architecture.md`, `capability-seams.md`, `module-graph.md` — Composition, service/provider/consumer split, and dependency graph.
- `cookbook/extension-cookbook.md`, `cookbook/adding-a-package.md`, `cookbook/adding-a-tool.md` — Authoring patterns and extension points.
- `subsystems/commands.md`, `subsystems/skills.md`, `subsystems/subagent.md` — Command, skill, and delegation APIs.
- `subsystems/extensions.md`, `subsystems/agent-team.md`, `subsystems/mcp.md` — Dynamic plugins, agent teams, and external tools.
