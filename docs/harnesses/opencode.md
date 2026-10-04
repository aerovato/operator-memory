# OpenCode V1 (legacy)

OpenCode V1 is deprecated. Prefer the [OpenCode V2 adapter](opencode-v2.md) on current OpenCode.

### Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install opencode
```

Restart OpenCode after installation. Until OpenCode reloads the plugin, commands and preamble injection will not work.

### Verify

In a new conversation, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, injection is not working.

Secondary signal: the optional TUI status indicator shows `Operator Ready (vX.Y.Z)`; local installs show `(Local Build)`.

### Commands

- `/operator:user-init`
- `/operator:project-init`
- `/operator:index`
- `/operator:repair`

Run each in a new conversation. See [Getting Started](../getting-started.md#appendix-commands) for what each command does.

### Update

The plugin updates itself after a restart when a newer npm release exists. On success OpenCode shows `Operator Updated`; on a failed update it shows `Operator Update Failed` or `Operator Update Queued`.

### Troubleshooting

- Any update or load failure: rerun `operator-helper install opencode` and restart OpenCode. This is also the recovery path for a damaged plugin cache.
- A container launch that rebuilds the plugin cache can reject a freshly published version because of npm release-age policy. The install command sets `NPM_CONFIG_MIN_RELEASE_AGE=0` itself; other cache rebuilds need the same environment override or a persisted cache.
- Sidebar `Error` or missing memory: run `/operator:repair` in a new conversation. See [Troubleshooting](../troubleshooting.md).
