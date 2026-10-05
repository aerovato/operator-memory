# Claude Code Commands

Last Updated: October 3, 2026

How the four Operator command intents surface on Claude Code. Plugin commands and skills are markdown files; there is no code-level command registration in the settings-hook pathway (the mod API adds one — see [`mods.md`](./mods.md)).

## Slash commands

Files in the plugin's `commands/` directory are auto-discovered. A plugin command is invocable as `/<command-name>` and listed with its plugin label; plugin skills are invocable as `/<plugin>:<skill>`. Subdirectories add namespace segments (`/<command> (plugin:<plugin>:<dir>)`).

Naming: Operator's canonical `/operator:user-init`, `/operator:project-init`, `/operator:index`, `/operator:repair` map naturally — either four command markdown files named `user-init.md`, `project-init.md`, `index.md`, `repair.md` (invoked as `/user-init` with an `operator` plugin label), or four skills invoked as `/operator:user-init` and so on. The skill form reproduces the colon names exactly and adds model-invocability control; prefer it unless command-only features are needed.

Live-verified on v2.1.287: plugin skills use directory basenames for the displayed invocation names, even with differing frontmatter names or `skills: ["./skills"]` in the manifest. Use `skills/user-init/`, `project-init/`, `index/`, and `repair/` to expose the canonical names. The scratch `/operator:repair` flow executed Helper version and memory checks and left uninitialized partitions untouched.

## Command markdown format

Markdown with optional YAML frontmatter:

- `description` — shown in `/help`; keep under ~60 characters
- `allowed-tools` — tool allowlist while the command runs, e.g. `Bash(operator-helper:*), Read, Edit, Write`
- `argument-hint` — autocomplete hint
- `model` — pin a model for the command's turn
- `disable-model-invocation` — user-manual-only commands

The body is the prompt sent when the command runs. Frontmatter `hooks` can register session-scoped hooks on invocation (not needed by Operator).

## Calling Helper from commands

Commands are agent-driven: the markdown instructs Claude to execute the single canonical Helper command itself (`operator-helper <area> init` — `user init`, `project init`, or `index init`) through the Bash tool, then follow the emitted guide; the harness never executes Helper on the agent's behalf. Patterns:

- Bash execution with frontmatter pre-approval: `allowed-tools: Bash(operator-helper:*)`
- Reference plugin-bundled resources with `${CLAUDE_PLUGIN_ROOT}` and `@${CLAUDE_PLUGIN_ROOT}/path` file includes
- `$1`, `$2`, ... substitute command arguments; `!`command`` inline execution and `$ARGUMENTS` are available

Shared execution contract from the reference implementation applies: check Helper availability first, skip normal operations on failure with a rerun instruction, frame command and output with the canonical boundaries, and follow the emitted guide agent-driven in the current conversation. Never reimplement Helper logic in command markdown.

## Skills

Plugin skills live in `skills/<name>/SKILL.md` with `name` and `description` frontmatter; `references/`, `examples/`, and `scripts/` subfolders hold supporting material. Skill names and descriptions occupy context every turn (the "context cost" of a plugin); full text loads only on invocation. Keep the four Operator skill descriptions short.

SessionStart can return `reloadSkills: true` so skills installed during a session are usable immediately — relevant only if Operator ever installs skills at runtime; Helper setup writes Brain files, not skills, so this is likely unnecessary.

## Discovery and verification

- `/help` and the `/` autocomplete list installed commands with their plugin label
- `/plugin` Installed tab and `claude plugin list` show installed plugins and versions
- `claude plugin details <name>` reports a plugin's always-on context cost — worth checking that the Operator plugin stays cheap (thin skill descriptions; no heavyweight agents)
