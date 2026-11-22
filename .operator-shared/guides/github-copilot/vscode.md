### VS Code Copilot Agent Integration

Last Updated: November 22, 2026

Source-grounded integration guide for the VS Code Copilot session target on the `1.148.0` development tree at `733a99842b0e0e14c3593dfab31fff2035478ba0`. The checked source pins `@microsoft/copilot-sdk` `2.0.1` in the workbench package. Editor behavior requiring a model turn is still unverified on a matching executable.

#### Confirm the target and owner

Select **Copilot** in Chat or the Agents window. The deprecated **Local** target uses editor-owned hooks with PascalCase events and often nested `hookSpecificOutput`. A plugin installed through VS Code does not translate those scripts into the Copilot runtime contract. An older or alternate **Copilot CLI** chat-session integration also exists under the built-in extension. The Agent Host integration has its own current launcher and uses the public SDK boundary.

The editor's **Agent Customizations → Plugins** view uses the selected target. Current source calls Agent Host `listPluginInstallations`, checks that the runtime supplies an available plugin directory and enablement, and delegates enable/disable and uninstall using native installation IDs. This is more specific than the documentation's description of discovering the CLI installation folder. A directory on disk, an Extensions view entry, or a customization preview alone establishes neither active enablement nor hook execution.

#### Where plugins execute

For a normal filesystem workspace, VS Code builds a launch plan with the active folder or worktree as the working and customization anchor. The launcher passes filesystem plugin paths to `plugins.directories` so the SDK/runtime discovers plugin assets. It explicitly projects custom agents where needed. The launcher enables repository hooks only when the host recognizes the working directory as trusted, hooks are enabled, and the workspace is nonvirtual. VS Code's own tool tracking callbacks are separate.

For plugin content without a native file directory, the launcher sends parsed pieces through `toSdkHooks`. At this pin the bridge **drops `SessionStart` output** after executing the command, and its map omits `SubagentStart` and `PreCompact`. It forwards a string `modifiedTransformedPrompt` on its transformed-prompt path. That bridge cannot be assumed to supply complete preamble and child coverage. Use a plugin with a directory visible to the target runtime when verifying native startup injection. Virtual workspaces disable the scanned plugin directories and several other discovery inputs. Remote windows can have different host-owned or client-supplied plugins, different filesystem paths, and a different executable environment. [VS Code launcher](https://github.com/microsoft/vscode/blob/733a99842b0e0e14c3593dfab31fff2035478ba0/src/vs/platform/agentHost/node/copilot/copilotSessionLauncher.ts#L1619-L1655) · [Fallback bridge](https://github.com/microsoft/vscode/blob/733a99842b0e0e14c3593dfab31fff2035478ba0/src/vs/platform/agentHost/node/copilot/copilotPluginConverters.ts#L460-L468)

#### Develop and verify

1. Use **Chat: Open Customizations Editor** and select the Copilot target and intended workspace. Install from a marketplace or use its install-from-source flow for a local development directory. A same-host native CLI install can also appear through the runtime inventory. A CLI `--plugin-dir` mount belongs to that CLI process.
2. Confirm the plugin's enabled state for the intended workspace scope. Start a fresh Copilot session, check both setup actions in the slash picker, and send a harmless first-turn probe. **Chat: Show Debug View** and the Agent Host logs can diagnose launch and discovery. Compare a synthetic hook marker in the provider request where a controlled provider is available. A model repeating a marker is weaker evidence.
3. Exercise a second turn, a fresh session, resume, compaction, and delegated first turns using [the verification matrix](./injection.md#verification-matrix). Record the editor version, SDK/runtime version if exposed, selected target, worktree or folder mode, and plugin owner.
4. Verify a clean runtime restart after update or disable/enable. In a remote window, check the host running the hook, the corresponding plugin store, and Helper PATH. Interactive shell discovery alone can miss the Agent Host environment.

#### Verification Notes

Source inspection traced the current launcher into the SDK's on-disk plugin discovery and its non-file callback path. The available desktop executable reported `1.112.0`, so this research includes no live claim for the pinned VS Code version. The `1.0.114` CLI wire probe verifies the tested CLI runtime only.

#### Sources

- [VS Code agent plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins), [Configure hooks](https://code.visualstudio.com/docs/agent-customization/hooks), and [Migrate Local customizations](https://code.visualstudio.com/docs/agent-customization/migrate-customizations).
- `references/vscode/package.json:3,116` pins the editor and SDK versions. `references/vscode/src/vs/platform/agentHost/node/copilot/copilotAgent.ts:8166–8187` selects the session folder or worktree anchor. `references/vscode/src/vs/platform/agentHost/node/copilot/copilotSessionLauncher.ts:1624–1655,1887–1942` wires native plugin directories, hook callbacks, trust, and cwd. `references/vscode/src/vs/workbench/contrib/chat/common/plugins/agentPluginServiceImpl.ts:914–1010` owns editor discovery of the runtime inventory.
- `references/vscode/src/vs/platform/agentHost/node/copilot/copilotPluginConverters.ts:460–468,570–602` defines fallback event mapping and outputs. `references/vscode/extensions/copilot/src/extension/intents/node/toolCallingLoop.ts:1015–1089,1170–1231` handles Local start hooks in the separate editor-owned tool loop.
