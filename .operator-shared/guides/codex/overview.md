# Codex Guide

Last Updated: September 15, 2026

Official-documentation reference for OpenAI's Codex surfaces and extension facilities. Research was retrieved September 14, 2026. Undocumented behavior is not treated as fact.

## Scope

Primary local surfaces covered by this guide:

- Codex CLI
- Codex Desktop (the ChatGPT desktop app's Codex and Work experiences, which share the same local Codex backend)

Hosted execution is grouped as Web surfaces (Web Chat, ChatGPT Codex Web, and other hosted execution) and archived in [`web-research.md`](./web-research.md).

The IDE extension shares some Codex facilities but is not a primary focus of this research.

## Terminology

- **Codex Desktop** — the local Codex runtime inside the ChatGPT desktop app, covering both its Codex and Work experiences.
- **Codex CLI** — the local `codex` command-line runtime.
- **Web Chat** — ordinary ChatGPT conversation on any platform. Incompatible; ignored.
- **ChatGPT Codex Web** — hosted Work/Codex execution in OpenAI's cloud. Incompatible; ignored.
- **Web** — any non-local hosted surface collectively.

## Guide Map

- [`surfaces.md`](./surfaces.md) - Codex Desktop and Codex CLI execution environments, shared configuration, projects, and support boundaries.
- [`hooks.md`](./hooks.md) - Lifecycle events, hook context and output, trust, limits, and plugin hook packaging.
- [`plugins.md`](./plugins.md) - Plugin manifests, package contents, marketplaces, installation, enablement, and updates.
- [`formats.md`](./formats.md) - Concrete file formats: manifests, `hooks/hooks.json`, `mcp.json`, `marketplace.json`, and skill metadata.
- [`commands.md`](./commands.md) - Skills, slash commands, deprecated custom prompts, and setup-workflow affordances.
- [`context-facilities.md`](./context-facilities.md) - `AGENTS.md`, Codex configuration, MCP instructions, app-server, and SDK context facilities.
- [`web-research.md`](./web-research.md) - Archived Web-surface research; reference only.

## Facility Summary

Codex CLI and Codex Desktop expose these relevant facilities:

- Plugin-bundled `SessionStart` and `SubagentStart` hooks can add dynamic developer context.
- Hooks receive the session working directory and session identity.
- Plugins can bundle skills for explicit setup workflows.
- Plugins can be distributed through public, workspace, Git, local, and npm-backed sources.
- Codex CLI and Codex Desktop share local configuration and MCP state.

Web surfaces do not expose equivalent local lifecycle and filesystem facilities.

## Primary Sources

- [Plugins documentation index](https://developers.openai.com/plugins/llms.txt)
- [Codex documentation index](https://developers.openai.com/codex/llms.txt)
- [Codex manual](https://learn.chatgpt.com/docs/codex-manual)
