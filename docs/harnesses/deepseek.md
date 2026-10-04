# DeepSeek Harness

### Install

Requires Node.js 22.19 or newer, DeepSeek Harness, and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install deepseek
```

Helper attempts the default Web and Desktop profiles independently. Restart Web after installation. Desktop uses its own bundled runtime: launch Desktop once to initialize its profile, fully quit the application, then rerun the install command using Desktop's installed `dsh` command. You can also install Operator from Desktop's Plugins page.

Install into another profile with DeepSeek's native command:

```sh
dsh plugin --profile <profile-name> add @aerovato/operator-deepseek
```

### Verify

Web and Desktop display `Operator Ready (vX.Y.Z)` beneath the active conversation's composer when the plugin is available.

In a new conversation, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the Brain, partitions, and memory-aware workflow. If it cannot, injection is not working.

### Commands

DeepSeek command names use hyphens:

- `/operator-user-init`
- `/operator-project-init`
- `/operator-index`
- `/operator-repair`

Run each in a new conversation. See [Getting Started](../getting-started.md#appendix-commands) for what each command does. Profiles without DeepSeek's interactive command service still receive the Operator preamble but do not expose these commands.

### Update

Rerun `operator-helper install deepseek`, or update a specific profile through DeepSeek:

```sh
dsh plugin --profile <profile-name> update @aerovato/operator-deepseek
```

Fully quit Desktop before updating its profile and use Desktop's installed `dsh` command. Restart the affected profile after updating.

### Troubleshooting

- Web installs but Desktop does not: launch Desktop once, fully quit it, select Desktop's `dsh` command through **Manage dsh Command…**, then rerun the install. The npm-installed CLI cannot manage Desktop's profile. The Desktop Plugins page is an alternative.
- Commands are absent: the active profile does not provide DeepSeek's interactive command service. Preamble injection remains available.
- Operator guidance is absent: rerun the profile installation command and restart that profile.
- Missing memory or load failures: run `/operator-repair` in a new interactive conversation. See [Troubleshooting](../troubleshooting.md).
- An out-of-process ACP, SDK, Codex, or Claude Code delegated agent does not receive Operator from its parent. Install the matching Operator adapter in that delegated harness.
