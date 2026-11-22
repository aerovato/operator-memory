---
description: VS Code workbench plugin discovery, current Copilot Agent Host launcher, SDK bridges, and older Local hook implementation
read_if: Implementing Operator for VS Code Copilot or tracing plugin discovery, enablement, hook execution, workspace settings, and model request ownership
---

# VS Code Copilot Source

## Coverage

- `references/vscode/`, focusing on Copilot plugin authoring and implementation. See the [checkout pin and commands](overview.md#vs-code).

## Architecture

- The editor displays and manages customization metadata. The Agent Host resolves session workspace/trust and hands ordinary plugin directories to the shared Copilot runtime via the SDK.
- The Agent Host converts assets without a native disk directory into staged SDK options or registered callbacks. The built-in extension also contains an editor-owned Local hook loop and a separate extension-host CLI session integration.

## `references/vscode/` Index

- `package.json`, `extensions/copilot/package.json` — Workbench SDK dependency, built-in extension version, settings, and its terminal CLI package dependency.
- `extensions/` — Bundled extensions. Relevant Copilot areas are listed below.
- `src/` — Workbench and platform source.
- `build/`, `resources/`, `scripts/`, `test/` — Build, product assets, development utilities, and integration tests.

### `src/vs/platform/agentHost/node/copilot/`

- `copilotAgent.ts` — Session creation, working/customization anchor, runtime-owned plugin RPCs, and resume.
- `copilotSessionLauncher.ts` — SDK launch/open configuration, native plugin directories, hook policy, fallback handler registration, and active cwd.
- `copilotPluginConverters.ts` — Customization and fallback hook translation. Its start callback discards hook stdout and its callback map omits child-start and pre-compaction.
- `copilotAgentSession.ts` — Provider session lifecycle and event handling.
- `customizations/` — Runtime plugin and other customization management.
- `../../test/node/` — Agent Host fixtures and tests, including provider registrations and plugin/customization boundaries.

### `src/vs/platform/agentPlugins/` and `src/vs/workbench/contrib/chat/`

- `common/agentPluginParser.ts`, `common/pluginParsers.ts` in `agentPlugins/` — Format detection, manifest metadata, event and skill parsing, native namespace layout.
- `common/plugins/agentPluginServiceImpl.ts` — Workbench inventory adapters. `CopilotCliAgentPluginDiscovery` uses the runtime Agent Host provider; configured local and marketplace discovery are separate.
- `common/promptSyntax/`, `browser/aiCustomization/` — Hook schema, aliases, and customization editing.
- `test/common/plugins/` — Format precedence, runtime inventory, enablement, discovery and collision cases.

### `extensions/copilot/src/extension/`

- `chatSessions/copilotcli/` — Standalone VS Code extension-host CLI session lifecycle, SDK adapter, customization provider, and source map in `AGENTS.md`.
- `chat/vscode-node/chatHookService.ts` — Local harness hook execution and result aggregation.
- `intents/node/toolCallingLoop.ts` — Local first-turn and child-start context consumption plus turn handling.
- `intents/test/node/toolCallingLoopHooks.spec.ts` — Local hook behavior tests.
