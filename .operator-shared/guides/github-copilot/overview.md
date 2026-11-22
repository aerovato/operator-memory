### GitHub Copilot Plugin Development

Last Updated: November 22, 2026

Implementation reference for GitHub Copilot CLI and the VS Code **Copilot** session target. CLI runtime observations cover `1.0.114` on macOS ARM64. VS Code findings are pinned to upstream `1.148.0` development source and the contemporaneous documentation. This is research for a future Operator adapter.

#### Guide map

- [Plugins and distribution](./plugins.md) covers format selection, layouts, native install and update, and enablement.
- [Hooks](./hooks.md) covers command transport, schemas, discovery, trust, and failure handling.
- [Preamble and delegation](./injection.md) covers first-call delivery, context lifetime, subagents, and what remains to validate.
- [Setup commands](./commands.md) covers explicit-only skills and native command alternatives.
- [VS Code integration](./vscode.md) traces the runtime boundary, discovery and execution paths, and editor verification.

#### Choose the execution surface

- **Copilot CLI** runs the terminal client against the Copilot runtime. In this guide, `--plugin-dir` refers to its transient development mount. A direct or marketplace install is a separate durable registration.
- **Copilot in VS Code** is a session target using the shared Copilot runtime through the editor's Agent Host. VS Code owns session launch, workspace selection and trust, customization presentation, and its runtime callbacks. The native runtime handles the ordinary on-disk plugin's execution. There is also an extension-host CLI session integration in the source tree. Check the selected target before using its behavior as evidence for the Agent Host path.
- **Local in VS Code** is the deprecated editor-owned harness with its own hook executor, output envelopes, and lifecycle. The label **Local** here names a harness. A **Copilot** session can also run on the local machine.
- **Cloud, remote, and virtual sessions** can change which host owns the runtime, filesystem, plugin inventory, and Helper. Treat each as a distinct verification target. The GitHub cloud agent starts with repository hooks and an ephemeral filesystem. An installed desktop or terminal plugin is evidence for the local surface where it was enabled.

#### Implementation status

Copilot has a native start-context hook, plugin-owned scripts, explicit-only skills, and native distribution. The CLI probe established first-request delivery for a synthetic preamble, fresh injection on cold resume, and first child delivery for `explore` and an explicit `general-purpose` task. The latter differs from the published hook reference. Verify in-place compaction and coverage in the VS Code Agent Host before claiming the [complete Operator adapter contract](../../specs/reference/implementation.md). Installation visibility, hook execution, and exact model-input delivery are separate checks.

Evidence labeled **verified** comes from a pinned source branch or the identified executable probe. **Documented** refers to a vendor or standards contract. **Unestablished** identifies an implementation decision that needs a bounded test. The CLI release tree publishes installation and release material. The SDK source and VS Code source expose open integration layers. They do not contain the implementation of the native Copilot agent runtime.

#### Sources

- [GitHub Copilot CLI releases](https://github.com/github/copilot-cli/releases/tag/v1.0.114) and [Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference).
- [VS Code Copilot migration](https://code.visualstudio.com/docs/agent-customization/migrate-customizations) and [Agent plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins).
- [Copilot SDK architecture](https://github.com/microsoft/copilot-sdk/blob/d73005fa87c82b44ac0a5d8ed5b209372591a32e/README.md#architecture), [CLI source snapshot](https://github.com/github/copilot-cli/tree/c41b148a2a85a8502c9e7bf73cb4d04d707f6576), and [VS Code source snapshot](https://github.com/microsoft/vscode/tree/733a99842b0e0e14c3593dfab31fff2035478ba0).
