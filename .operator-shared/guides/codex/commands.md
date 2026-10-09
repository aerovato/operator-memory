# Codex Commands and Skills

Last Updated: September 27, 2026

Verified command, skill, invocation, and script-execution facilities.

## Skills

Skills package task-specific instructions, references, assets, and optional scripts. They use progressive disclosure:

1. ChatGPT or Codex initially receives skill metadata.
2. The host loads the full `SKILL.md` when the skill is selected explicitly or matched implicitly.
3. Supporting references and scripts are loaded or executed when needed.

A skill requires a `SKILL.md` with `name` and `description` frontmatter. Current client validation requires `name` to match the skill directory name. A missing `name` defaults to the directory name; names have a 64-character limit. `description` is required but the parser preserves values beyond the documented 1,024-character recommendation. Optional `agents/openai.yaml` can define presentation, invocation policy, and MCP dependencies. Set `policy.allow_implicit_invocation` to `false` when a skill must require explicit selection.

## Invocation

Skills can be invoked in two ways:

- Explicitly: `$skill-name`, or the `/skills` picker in Codex CLI and Codex Desktop. `@` invocation exists on Web Chat surfaces.
- Implicitly: the model selects a skill when the user request matches its description and implicit invocation is allowed.

Source-verified for Codex CLI: there is no `/skill-name` invocation syntax. The TUI slash-command registry is a fixed enum; `/skills` is a management picker, not an invocation prefix. A plain-name mention in text is a model-instruction trigger from the injected catalog, not a parsed explicit selection; only `$name` sigils and picker inserts are parsed selections. Mention parsing accepts colons and hyphens, but cross-platform plugin skills use hyphens because the validated skill name must match its folder and Windows folder names cannot contain colons.

Skills are agent instructions. The catalog prompt directs the model to read the full `SKILL.md`, run or patch bundled `scripts/`, and reuse `assets/`. A skill can therefore direct the agent to run shell commands and embed results, subject to the normal approval policy.

## Skill Locations

Standalone local skills are available in Codex Desktop, Codex CLI, and the IDE extension. Codex scans:

- `.agents/skills` from the current directory through the repository root
- `$HOME/.agents/skills`
- `/etc/codex/skills`
- OpenAI-bundled system skills

Plugins can bundle one or more skills under their root `skills/` directory. Plugin-bundled skills are available in Codex CLI and Codex Desktop after installation and a new session.

## Slash Commands

Codex owns its built-in slash commands. The documented plugin manifest does not define arbitrary slash-command registration.

Relevant built-in commands include:

- `/plugins`
- `/hooks`
- `/skills`
- `/mcp`
- `/init`
- `/new`
- `/clear`
- `/resume`
- `/compact`
- `/agent` and `/subagents`

Codex Desktop has its own documented slash-command set. Skills can appear in its command discovery, but no official plugin field assigns a custom namespaced slash command.

## Deprecated Custom Prompts

Custom prompts turn top-level Markdown files under `~/.codex/prompts/` into `/prompts:<name>` commands. They:

- Require explicit invocation.
- Are documented for Codex CLI and IDE.
- Are local to the user's Codex home.
- Are not shared through a repository.
- Require a restart or new session after changes.
- Are deprecated in favor of skills.

Custom prompts support frontmatter descriptions, argument hints, positional arguments, named arguments, and `$ARGUMENTS` expansion.

## Skill Scripts and Approval

Skills can include scripts for deterministic behavior. In the current source revision the separate skill-script approval path has been removed; skill scripts run under the turn's normal sandbox and command-approval policy, the same as any agent shell command. Writes outside the active workspace, including user-global files, therefore use the normal sandbox and approval flow.

## Sources

- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Skills](https://developers.openai.com/plugins/concepts/skills)
- [Build plugin skills](https://developers.openai.com/plugins/build/skills)
- [Skills and plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
- [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Desktop slash commands](https://learn.chatgpt.com/docs/reference/slash-commands)
- [Custom prompts](https://learn.chatgpt.com/docs/custom-prompts)
