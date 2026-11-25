# Codex Guide

Last Updated: November 25, 2026

Implementation reference for OpenAI's Codex CLI and Codex Desktop. Sources: the official documentation, the `references/codex/` source clone, and the plugin guide's verified-client notes. Undocumented behavior is not treated as fact.

## Scope

- Codex CLI
- Codex Desktop (the ChatGPT desktop app's Codex and Work experiences, which share the same local Codex backend)

The IDE extension shares some Codex facilities but does not support plugins. Hosted Web surfaces do not run local hook scripts and are out of scope; see [Web Limits](./plugins.md#web-limits).

## Terminology

- Codex Desktop — the local Codex runtime inside the ChatGPT desktop app, covering both its Codex and Work experiences.
- Codex CLI — the local `codex` command-line runtime.
- Web — any non-local hosted surface collectively.

## Guide Map

- [`surfaces.md`](./surfaces.md) - Codex Desktop and Codex CLI execution environments, project folders, and subagents.
- [`hooks.md`](./hooks.md) - Lifecycle events, hook context and output, trust, limits, and plugin hook packaging.
- [`plugins.md`](./plugins.md) - Plugin manifests, package contents, marketplaces, installation, enablement, and updates.
- [`formats.md`](./formats.md) - Concrete file formats: manifests, `hooks/hooks.json`, `mcp.json`, `marketplace.json`, and skill metadata.
- [`commands.md`](./commands.md) - Skills, slash commands, and setup-workflow affordances.

## Binding

The implemented binding is [`specs/codex/implementation.md`](../../specs/codex/implementation.md):

- A legacy `.codex-plugin/plugin.json` plugin bundles `SessionStart` and `SubagentStart` command hooks that run `operator-helper preamble`; only the legacy manifest format loads lifecycle hooks.
- Hook output is persisted developer context, re-rendered at each lifecycle event.
- Plugin hooks are skipped until the user trusts them through Codex's native startup review.
- Setup workflows are explicitly invoked skills (`$operator-user-init`, `$operator-project-init`); plugins cannot register slash commands.
- Installation registers the repository Git marketplace and installs the npm-backed plugin.

## Primary Sources

- [Plugins documentation index](https://developers.openai.com/plugins/llms.txt)
- [Codex documentation index](https://developers.openai.com/codex/llms.txt)
- [Codex manual](https://learn.chatgpt.com/docs/codex-manual)
