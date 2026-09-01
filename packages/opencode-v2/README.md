# Operator Memory for OpenCode V2

Operator Memory gives OpenCode V2 durable project and user context maintained by agents as readable Markdown.

OpenCode V2 is a separate, incompatible plugin platform. This package supports V2 only; use `@aerovato/operator-opencode` for OpenCode V1.

## Install

```sh
operator-helper install opencode-v2
```

The server plugin injects one immutable rendered Operator preamble into every model call for each session and registers `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`.

The TUI displays connecting and ready state, package version or local-build identity, User/Private/Shared partition status, repair guidance, completed-turn refresh, and preamble recovery, error, and automatic-update notifications.
