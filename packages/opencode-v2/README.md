# Operator Memory for OpenCode V2

Operator Memory gives OpenCode 2 durable project and user context maintained by agents as readable Markdown. For OpenCode 1, use `@aerovato/operator-opencode`.

## Install

```sh
operator-helper install opencode-v2
```

The server plugin injects one immutable rendered Operator preamble into every model call for each session and registers `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`.

The TUI displays connecting and ready state, package version or local-build identity, User/Private/Shared partition status, repair guidance, completed-turn refresh, and preamble recovery and error notifications.
