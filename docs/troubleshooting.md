# Troubleshooting

### Helper And Plugin Installation

#### Requirements

Operator Helper requires Node.js 20 or newer.

#### Install Or Reinstall The Adapter

Run `operator-helper install <id>` for your harness — see the [harness docs](harnesses/) for the exact command, verification, and update behavior:

- [Claude Code](harnesses/claude-code.md)
- [Codex](harnesses/codex.md)
- [OpenCode](harnesses/opencode-v2.md)
- [Pi](harnesses/pi.md)
- [DeepSeek Harness](harnesses/deepseek.md)
- [Kiro](harnesses/kiro.md)

Restart the harness after installation or repair. Until the harness reloads the adapter, setup commands and preamble injection will not behave as expected.

#### Helper Updates

Run `operator-helper version` to check for updates and `operator-helper upgrade` to install them. Setup and automatic loading recovery check the version before continuing. If Helper cannot determine whether Bun or npm owns the global installation, update it using the original installation method.

Adapter updates are harness-specific; see the [harness docs](harnesses/).

### Partition And Memory Repair

If a partition fails to load, the preamble directs the agent to repair loading before ordinary work. After successful recovery, start a new session and resubmit your original request so the complete preamble loads.

For on-demand diagnosis, ask the agent or run `operator-helper memory check` from the project directory. It validates loading only and does not modify files.

#### Private Files Appear In Git

Run `operator-helper project status` to inspect ignore and tracking status. Project initialization ensures the exact `.operator/` entry is in the global Git ignore, but does not untrack files already committed or staged.
