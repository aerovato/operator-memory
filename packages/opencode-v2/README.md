# Operator Memory for OpenCode

Operator Memory gives current OpenCode (V2) durable project and user context maintained by agents as readable Markdown. For legacy OpenCode V1, use `operator-helper install opencode-v1` and the separate `@aerovato/operator-opencode` package.

### Install

```sh
operator-helper install opencode
```

The server plugin injects one immutable rendered Operator preamble into every model call for each session and registers `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`.

The TUI displays connecting and ready state, package version or local-build identity, User/Private/Shared partition status, repair guidance, completed-turn refresh, and preamble recovery and error notifications.

### Local Development

From the repository root, run `bun run install:opencode`. It builds and links Helper, builds the development plugin, and registers its local directory globally while disabling the published plugin ID. Existing config is preserved. Restart OpenCode to load the build; there is no separate preview command.
