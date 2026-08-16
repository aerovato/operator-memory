# Operator Memory For OpenCode

Operator Memory: Durable context for agent-driven development.

This package is the OpenCode adapter for Operator Memory. It gives OpenCode agents deterministic project and user context from a human-readable Brain they continuously maintain as Markdown.

## Install

Install Operator Helper first:

```sh
npm install --global @aerovato/operator-helper
```

Then install or update the OpenCode adapter:

```sh
operator-helper install opencode
```

Restart OpenCode after installation. In a new conversation, run `/operator:user-init` to begin setup.

Do not install this package directly unless you are integrating Operator with OpenCode manually. The Operator Helper CLI is required for the plugin to work.

## OpenCode Commands

- `/operator:user-init` initializes or revises user-global instructions.
- `/operator:project-init` initializes project setup and guides Private and Shared knowledge.
- `/operator:index` builds or refreshes the Project Index.
- `/operator:repair` diagnoses and repairs loading problems.

Run each Operator command in a new conversation so the agent can focus on setup, indexing, or repair with a clean working context.

## Documentation

- [Overview and setup](https://github.com/aerovato/operator#readme)
- [Workflow](https://github.com/aerovato/operator/blob/main/docs/workflow.md)
- [Architecture](https://github.com/aerovato/operator/blob/main/docs/architecture.md)
- [Troubleshooting](https://github.com/aerovato/operator/blob/main/docs/troubleshooting.md)

Licensed under the BSD 3-Clause License.
