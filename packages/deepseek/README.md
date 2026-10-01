# Operator Memory for DeepSeek Harness

Operator Memory gives DeepSeek Harness durable project and user context maintained by agents as readable Markdown.

## Install

Requires Node.js 22.19 or newer, DeepSeek Harness, and the [Helper](https://github.com/aerovato/operator-memory#install-operator) installed.

```sh
operator-helper install deepseek
```

Helper attempts the default Web and Desktop profiles independently. Restart Web after installation. Desktop uses its own bundled runtime: launch Desktop once to initialize its profile, fully quit the application, then rerun the install command using Desktop's installed `dsh` command.

Install into another profile with DeepSeek's native command:

```sh
dsh plugin --profile <profile-name> add @aerovato/operator-deepseek
```

## Verify

Web and Desktop display `Operator Ready (vX.Y.Z)` beneath the active conversation's composer when the plugin is available. In a new conversation, ask the agent whether Operator Memory guidance is available; it should outline the Brain, partitions, and memory-aware workflow.

## Commands

DeepSeek command names use hyphens:

- `/operator-user-init`
- `/operator-project-init`
- `/operator-index`
- `/operator-repair`

Profiles without DeepSeek's interactive command service still receive the Operator preamble but do not expose these commands.

## Update

Rerun `operator-helper install deepseek`, or update a specific profile through DeepSeek:

```sh
dsh plugin --profile <profile-name> update @aerovato/operator-deepseek
```

Fully quit Desktop before updating its profile and restart the affected profile after updating. See the [DeepSeek Harness guide](https://github.com/aerovato/operator-memory/blob/main/docs/harnesses/deepseek.md) for troubleshooting.
