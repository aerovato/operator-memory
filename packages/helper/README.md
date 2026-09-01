# Operator Helper

Operator Memory: Durable context for agent-driven development.

Operator Helper installs and manages Operator Memory, an agent-driven development framework that turns agent work into lasting project knowledge through continuous documentation.

## Install

Operator Helper requires Node.js 20 or newer.

```sh
npm install --global @aerovato/operator-helper
```

Or with Bun:

```sh
bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest
```

Install an adapter:

```sh
# OpenCode
operator-helper install opencode

# OpenCode V2 beta
operator-helper install opencode-v2

# Code Puppy
operator-helper install code-puppy
```

Restart the harness, then run `/operator:user-init` in a new conversation to begin setup.

## Usage

Users interact with Operator through the harness commands `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`. These commands guide the working agent, which uses Operator Helper for setup, status, validation, and repair mechanics.

Run each Operator command in a new conversation so the agent can focus on that operation with a clean working context. Initialization preserves existing content. Project setup configures `.operator/` in the global Git ignore but does not automatically untrack files already committed.

The direct user-facing Helper operation is adapter installation:

```sh
operator-helper install opencode
operator-helper install code-puppy
```

Operator Helper automatically checks for and installs updates when commands run. If it cannot determine whether Bun or npm owns the global installation, it asks for a manual update using the original installation method.

## Documentation

- [Overview and setup](https://github.com/aerovato/operator-memory#readme)
- [Workflow](https://github.com/aerovato/operator-memory/blob/main/docs/workflow.md)
- [Architecture](https://github.com/aerovato/operator-memory/blob/main/docs/architecture.md)
- [Troubleshooting](https://github.com/aerovato/operator-memory/blob/main/docs/troubleshooting.md)

Licensed under the BSD 3-Clause License.
