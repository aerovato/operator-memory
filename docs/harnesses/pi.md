# Pi

### Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#installation) installed.

```sh
operator-helper install pi
```

Start a new Pi session after installation.

### Verify

In a new conversation, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, injection is not working.

Secondary signal: the footer shows `· Operator Active (vX.Y.Z)`; local builds show `(Local Build)`. `· Operator Unavailable` means memory failed to load — run `/operator:repair`. `· Operator Error` means rendering failed — rerun the install command and restart Pi.

### Commands

- `/operator:user-init`
- `/operator:project-init`
- `/operator:index`
- `/operator:repair`

Run each in a new conversation. See [Workflow](../workflow.md#commands) for what each command does.

### Update

Pi reports available package updates at startup. Apply them with:

```sh
pi update --extensions
```

### Troubleshooting

- No Operator footer: the extension did not load. Rerun `operator-helper install pi` and start a new session.
- Operator commands appear with a numeric suffix such as `:1`: another extension registered the same name. Use the suffixed name or rename the conflicting extension.
- Subagents do not receive Operator: only persistent package registrations are inherited by child processes. Install via the command above rather than a temporary `-e` registration.
- Footer `Unavailable` or missing memory: run `/operator:repair` in a new conversation. See [Troubleshooting](../troubleshooting.md).
