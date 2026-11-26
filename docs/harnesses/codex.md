# Codex

### Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install codex
```

Helper registers this project's public Git marketplace, installs the published npm plugin as `aerovato@operator-memory`, and verifies it is enabled. If Codex reports a conflicting marketplace source, Helper removes the `operator-memory` registration and retries with the Git source. Start a fresh Codex session after installation.

Approve Operator's context injection hooks in Settings > Hooks on Desktop or with `/hooks` in the TUI. Hooks may have to be reapproved when the plugin updates.

### Verify

Codex has no status UI, so verify through the agent. In a fresh session, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, check that the plugin is enabled and that its hooks are approved, then start a fresh session.

### Commands

Codex plugins cannot register slash commands. The Operator workflows are plugin skills, invoked explicitly or through Codex's skills picker:

- `$operator-user-init`
- `$operator-project-init`

See [Getting Started](../getting-started.md#appendix-commands) for what each workflow does.

### Update

Codex can refresh the registered Git marketplace in the background. To request an update explicitly, use its marketplace upgrade action or rerun:

```sh
operator-helper install codex
```

Then start a fresh Codex session.

### Troubleshooting

- Codex removes the Operator preamble when you revert the first turn. Operator checks the local transcript to restore the preamble automatically when it can verify that Codex discarded it.
- If the preamble is missing, check Operator's hook approval in Settings > Hooks on Desktop or with `/hooks` in the TUI. Then start a fresh session.
- The `codex` CLI is unavailable: Helper instead writes the `operator-memory` Git marketplace entry to `config.toml` (in `CODEX_HOME`, default `~/.codex`) and you install the plugin manually from Codex's plugins browser.
- Installation fails with an invalid `config.toml` error: Helper refuses to edit a `config.toml` whose `marketplaces` value is not expressed as tables. Convert it to table form and rerun the install command.
- Missing memory or load failures: see [Troubleshooting](../troubleshooting.md).
