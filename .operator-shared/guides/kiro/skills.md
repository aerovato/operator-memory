# Kiro Agent Skills

Last Updated: October 5, 2026

Kiro implements the open Agent Skills standard (`agentskills.io`).

## Format

A skill is a folder with a required `SKILL.md` (YAML frontmatter + markdown instructions) plus optional `scripts/`, `references/`, and `assets/` directories. Reference files load only when the instructions direct the agent to them.

Frontmatter:

- `name` — required; must match the folder name; lowercase letters, numbers, hyphens, max 64 chars
- `description` — required; when to use the skill; matched against user requests; max 1024 chars
- `license`, `compatibility`, `metadata` — optional

## Locations and discovery

- Workspace: `.kiro/skills/` — team/project workflows
- Global: `~/.kiro/skills/` — personal workflows across projects
- Workspace skills take priority on name clashes.

Verified on CLI binary `2.27.1`, V3 engine (`--v3`), KAS `0.66.22`: global skills are discovered and activated from ordinary `$HOME/.kiro/skills/`, even when `KIRO_HOME` is set. Skills placed only under the override are undiscovered. Full-body activation was verified using `disclose_context`; this tool must be allowed in headless experiments. See [injection verification](./injection.md).

Progressive disclosure: at session start only name and description load; full instructions load on activation. New skills are discovered when a session starts.

## Activation

- Automatically, when the request matches the skill description
- Explicitly as a slash command: `/skill-name` (skill folder name). Trailing text after the command is passed to the agent as extra context; `$ARGUMENTS`/`$` placeholder substitution into the skill body is CLI-only.

Imported via IDE import (GitHub URL or local folder, copied into the skills directory) or by placing folders directly in the locations above. `/context show` lists what is loaded in the current session.

## Custom agents

Custom agents do not load skills by default; add `skill://` URIs to the agent's `resources` field, e.g. `skill://~/.kiro/skills/*/SKILL.md`. The scheme supports specific paths, globs, and home-directory expansion.
