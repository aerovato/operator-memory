# Kiro

### Install

Requires Kiro IDE or Kiro CLI V3, Node.js 20 or newer, and the [Helper](../../README.md#installation) installed on `PATH`.

```sh
operator-helper install kiro
```

Helper writes the adapter into `~/.kiro`:

- `hooks/operator-memory.json` — `SessionStart` hook that runs `operator-helper preamble`. Kiro adds its output to the agent's context.
- `steering/operator-memory.md` — Always-included steering. If the hook did not inject the preamble, it tells the agent to run `operator-helper preamble` once itself.
- `skills/operator-user-init/`, `skills/operator-project-init/`, `skills/operator-index/`, `skills/operator-repair/` — Operator commands as Kiro skills.

Start a new Kiro session after installation.

### Verify

In a new session, ask:

```text
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, run `/operator-repair`.

### Commands

Kiro invokes skills as slash commands:

- `/operator-user-init`
- `/operator-project-init`
- `/operator-index`
- `/operator-repair`

Run each in a new session. See [Getting Started](../getting-started.md#appendix-commands) for what each command does.

### Memory And Updates

Kiro runs the hook at the start of every session, so a new session loads changed memory. When a Helper release changes the Kiro adapter, rerun the install command to refresh the adapter files:

```sh
operator-helper install kiro
```

### Troubleshooting

- The agent runs `operator-helper preamble` at the start of a session: the hook did not fire and the steering fallback loaded the preamble instead. Confirm `~/.kiro/hooks/operator-memory.json` exists and is enabled in Kiro's hooks panel, or rerun the install command.
- Helper failure: Kiro reports the hook's error output to the agent. Repair Helper's global installation and start a new session.
- Subagents do not receive the preamble: Kiro has no subagent start hook.
- Missing memory or load failures: run `/operator-repair` in a new session. See [Troubleshooting](../troubleshooting.md).
