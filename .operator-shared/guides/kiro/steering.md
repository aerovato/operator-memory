# Kiro Steering

Last Updated: October 5, 2026

## Scopes

- Workspace: `.kiro/steering/` — applies to that workspace.
- Global: `~/.kiro/steering/` — applies to all local workspaces (IDE, CLI; not Web/Mobile, which have no local filesystem).
- All scopes merge; on conflicting instructions, workspace steering wins.

Verified on CLI binary `2.27.1`, V3 engine (`--v3`), KAS `0.66.22`: global steering loads from ordinary `$HOME/.kiro/steering/`, even when `KIRO_HOME` is set. Steering placed only under the override does not load. See [injection verification](./injection.md).

Default foundation files (`product.md`, `tech.md`, `structure.md`) are always included; custom files follow their inclusion mode.

## Inclusion modes

Configured via YAML frontmatter that must be the very first content in the file:

- `inclusion: always` (default) — loaded into every interaction.
- `inclusion: fileMatch` with `fileMatchPattern` (string or array of globs) — loaded only when working with matching files.
- `inclusion: manual` — on-demand via `#file-name` reference in chat; also appears as a `/<filename>` slash command. This is the IDE's replacement for manual hooks.
- `inclusion: auto` with `name` and `description` — included when the request matches the description (skill-like matching); also usable as a slash command.

CLI V3 supports all four modes fully; CLI V1/V2 only auto-load `always` files.

## File references

Live references to workspace files inside steering content:

- `#[[file:<relative-path>]]` — whole file, all surfaces
- `#[[file:<path>:<line>]]` and `#[[file:<path>:<start>-<end>]]` — line ranges, CLI V3
- `#[[folder:<path>]]` — one-level folder listing, CLI V3

Unresolvable references leave a visible marker rather than silently dropping content.

## AGENTS.md

Kiro supports the AGENTS.md standard: files at the workspace root, in subdirectories throughout the workspace (each loaded as steering context), or in `~/.kiro/steering/`. AGENTS.md files are always included; they do not support inclusion modes.

## Subagents

- Built-in subagents inherit steering from the main agent. No documented general lifecycle hook injects a dynamically rendered preamble into them, so Operator must retain always-included steering.
- Steering can instruct an agent to run `operator-helper preamble` when its complete output is absent. This is agent-driven loading and depends on tool access; inherited steering alone is not the rendered preamble.
- Custom-agent configuration is outside Operator's integration scope; peripheral findings live in [injection verification](./injection.md).

## Team distribution

Global steering is designed for MDM/Group Policy distribution to `~/.kiro/steering` — an documented install pathway for machine-wide or team-wide context that does not touch the repository.
