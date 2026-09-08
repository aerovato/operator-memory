# Operator Memory for Pi

Operator Memory gives Pi durable project and user context maintained by agents as readable Markdown.

## Install

```sh
operator-helper install pi
```

The extension injects one immutable rendered Operator preamble into every model call for each session and registers `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`.

Pi displays Operator status in its footer. Pi checks installed packages for updates and prompts you to run `pi update --extensions` when an update is available.
