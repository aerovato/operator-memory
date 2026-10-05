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

### Known Bugs and Limitations

- `KIRO_HOME` is ignored in V3: hooks, steering, and skills still load from ordinary `~/.kiro`. Operator installs there accordingly. Verified with CLI binary `2.27.1`, the V3 engine (`--v3`), and KAS `0.66.22`.
- No automatic subagent injection: Kiro has no subagent start hook. Subagents must follow the inherited Operator steering instructions and run `operator-helper preamble` themselves.
- Hook failures do not block the session: a failed `SessionStart` command shows a warning to the user. The agent must follow the steering instructions to load Operator manually; if that command fails, it reports the failure and stops.

### Troubleshooting

- The agent runs `operator-helper preamble` at the start of a session: the hook did not fire and the steering fallback loaded the preamble instead. Confirm `~/.kiro/hooks/operator-memory.json` exists and is enabled in Kiro's hooks panel, or rerun the install command.
- Helper failure: Kiro shows the hook's error output to the user as a warning. Repair Helper's global installation and start a new session.
- Missing memory or load failures: run `/operator-repair` in a new session. See [Troubleshooting](../troubleshooting.md).
