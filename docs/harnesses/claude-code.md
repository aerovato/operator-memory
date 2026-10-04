# Claude Code

### Install

Requires Claude Code `v2.1.287` or newer, Node.js 20 or newer, and the [Helper](../../README.md#installation) installed on `PATH`.

```sh
operator-helper install claude-code
```

Helper registers the marketplace from `aerovato/operator-memory`, installs `operator@operator-memory` from npm through Claude's native installer, and verifies it is enabled. Claude owns the package download and cache. Start a new Claude Code process after installation.

### Verify

Run `claude plugin list` and confirm `operator@operator-memory` is enabled. In a fresh Claude Code process, ask:

```text
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should describe the Brain, partitions, and memory-aware workflow. Operator has no status UI in Claude Code.

### Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.

These are explicitly invoked skills. The agent runs Helper and follows its output in the current conversation, using your existing tool permissions. See [Getting Started](../getting-started.md#appendix-commands).

### Memory And Updates

Operator renders memory once per Claude Code process. It appends that preamble to the main system prompt and prepends the same text to delegated subagents' task prompts. Compaction keeps the cached preamble. `/clear`, `/resume`, and `/branch` do not refresh it; restart Claude Code to load changed memory.

Install adapter updates with:

```sh
operator-helper install claude-code
```

Or use Claude's native update command:

```sh
claude plugin update operator@operator-memory
```

Then restart Claude Code. Third-party marketplace auto-update is off by default; enable it in Claude's `/plugin` marketplace settings if wanted.

### Troubleshooting

- No injection: check the Claude Code version, confirm the plugin is enabled, and ensure `operator-helper` is on `PATH`.
- Hooks disabled: `disableAllHooks`, `--bare`, and `--safe-mode` prevent Operator's mod injection. Organization policies such as `allowManagedHooksOnly` and `allowManagedModsOnly` can restrict installed hooks or mods; check the applicable policy with your administrator.
- Helper failure: Operator logs a recovery cue and injects nothing. Repair Helper's global installation and restart Claude Code. A canonical memory-load diagnostic is injected normally; run `/operator:repair` to address its findings.
- Local plugin load failure: run `claude plugin validate <plugin-directory>` and launch with `claude --debug` for load diagnostics. For development, `bun run preview:claude-code` builds Helper and the adapter and launches the local plugin.
- Direct `<package>@npm` installation reports an account gate: use `operator-helper install claude-code`, which uses the repository marketplace's npm source instead.

See [Troubleshooting](../troubleshooting.md) for partition and memory repair.
