# OpenCode V2

### Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install opencode-v2
```

Restart OpenCode after installation. Until OpenCode reloads the plugin, commands and preamble injection will not work.

### Verify

In a new conversation, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, injection is not working.

Secondary signals: the home footer shows `Operator Ready (vX.Y.Z)` and the session sidebar shows partition states. `Operator Connecting` means the TUI is still verifying the server plugin; `Operator Unavailable` means the status query failed.

### Commands

- `/operator:user-init`
- `/operator:project-init`
- `/operator:index`
- `/operator:repair`

Run each in a new conversation. See [Getting Started](../getting-started.md#appendix-commands) for what each command does.

### Update

OpenCode V2 owns plugin updates:

```sh
opencode plugin check
opencode plugin update
```

Restart OpenCode after updating.

### Troubleshooting

- `Operator Connecting` persists: the server plugin is not active. Rerun `operator-helper install opencode-v2` and restart OpenCode.
- `Operator Unavailable` or sidebar `Error`: run `/operator:repair` in a new conversation. See [Troubleshooting](../troubleshooting.md).
- Duplicate plugin failures after installing both the global package and a local dev build: OpenCode V2 cannot dedupe package identity. Remove one source with `opencode plugin remove`.
