# Copilot Setup Commands and Skills

Last Updated: November 22, 2026

Explicit Operator setup invocation through Copilot CLI `1.0.114` and VS Code Copilot. Skill discovery was checked in the CLI. VS Code naming and availability are documented and source-grounded where indicated.

## Explicit skill pathway

Ship one folder and one `SKILL.md` per setup intent under root `skills/`. The folder name and YAML `name` must match. Use lowercase letters, digits, and single hyphen separators, up to 64 characters. Keep the name unqualified in YAML. VS Code documents automatically prefixing a plugin skill's displayed slash name, for example `/operator:user-init` for skill `user-init` in plugin `operator`. CLI skill inventory exposes the bare name. Confirm the CLI's actual prompt picker and slash spelling on the released package. The same bare name can collide with personal or project definitions, which have precedence in documented CLI discovery. Unique folder names are an option if the CLI presents unqualified slash actions.

```markdown
---
name: user-init
description: Set up the Operator Memory User Partition when the user invokes this skill.
user-invocable: true
disable-model-invocation: true
---

# Operator User Setup

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper user init` and follow the User Setup guide in its output with the user.

If Helper cannot start, install or repair the global npm package `@aerovato/operator-helper` and retry. If the version check, upgrade, or setup operation reports a failure, use its output to resolve the issue and retry. Report any unresolved blocker. Use Helper output as working context.
```

For the project skill, use `name: project-init`, `operator-helper project init`, and the Project Setup guide, including the guide's indexing workflow. The Agent Plugins manifest and skill files only register instructions. The harness hook renders a preamble independently. The agent runs setup in the current conversation after explicit user invocation, using the [Operator command contract](../../specs/commands.md).

VS Code documents that `user-invocable: true` makes the skill available from the slash picker and `disable-model-invocation: true` suppresses autonomous loading. CLI release notes separately record honoring disable-model-invocation. Omit `context: fork` and automatic trigger or tool-approval fields for these setup skills. Do not rely on descriptions alone for explicit execution. Check both visible commands and absence from model-invocable skill metadata.

## Native commands and other customization surfaces

The CLI documents native plugin command Markdown under `com.github.copilot/commands/`, and legacy plugins may supply a `commands` path. CLI precedence resolves existing skills before same-named custom commands. VS Code has native prompt files on the deprecated Local harness, but Microsoft's migration guide directs Copilot target users to skills for reusable slash prompts. Test namespaced execution and explicit-only behavior before choosing commands for one surface or claiming parity. A custom agent changes agent selection and can be delegated, so it is an unsuitable registration mechanism for these two current-conversation setup intents.

## Verification Notes

In an isolated `COPILOT_HOME`, CLI `1.0.114` installed a 1.0 manifest with a probe skill. `copilot skill list --json` returned the bare name, source `plugin`, path, and enabled state. That check proves discovery. The slash-menu label, actual explicit invocation, collision behavior, and suppressed model discovery need separate target-specific checks.

## Sources

- [GitHub CLI plugin format and component precedence](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference), [VS Code skill invocation and names](https://code.visualstudio.com/docs/agent-customization/agent-skills#use-skills-as-slash-commands), and [Prompt-file migration](https://code.visualstudio.com/docs/agent-customization/migrate-customizations#convert-prompt-files-to-skills).
- `references/vscode/src/vs/platform/agentPlugins/common/pluginParsers.ts:1349–1362` converts invocation flags for VS Code's plugin metadata. `references/copilot-sdk/nodejs/src/generated/rpc.ts:48417–48461` defines the runtime skill metadata fields. `references/copilot-cli/changelog.md:2692` records the model-invocation flag fix.
