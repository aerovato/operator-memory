# Codex

### Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install codex
```

Helper registers this project's public Git marketplace, installs the published npm plugin as `aerovato@operator-memory`, and verifies it is enabled. Existing Helper-managed local registrations are replaced with the Git source. Start a fresh Codex session after installation.

**When Codex first starts the plugin, it prompts you to approve Operator's hooks. Approve them — until you do, preamble injection silently does not run.**

### Verify

Codex has no status UI, so verify through the agent. In a fresh session, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, confirm the hooks were approved during Codex's startup review and that the plugin is enabled, then start a fresh session.

### Commands

Codex plugins cannot register slash commands. The Operator workflows are plugin skills, invoked explicitly or through Codex's skills picker:

- `$operator-user-init`
- `$operator-project-init`
- `$operator-index`

See [Getting Started](../getting-started.md#appendix-commands) for what each workflow does.

### Update

Codex can refresh the registered Git marketplace in the background. To request an update explicitly, use its marketplace upgrade action or rerun:

```sh
operator-helper install codex
```

Then start a fresh Codex session.

### Troubleshooting

- No preamble injection: hooks were not approved. Codex reviews untrusted or modified hooks at startup; approve Operator's hooks when prompted. Helper never writes hook trust itself.
- The `codex` CLI is unavailable: Helper instead writes the `operator-memory` Git marketplace entry to `config.toml` (in `CODEX_HOME`, default `~/.codex`) and you install the plugin manually from Codex's plugins browser.
- Installation fails with an invalid `config.toml` error: Helper refuses to edit a `config.toml` whose `marketplaces` value is not expressed as tables. Convert it to table form and rerun the install command.
- Missing memory or load failures: see [Troubleshooting](../troubleshooting.md).
