# Codex Surfaces

Last Updated: September 14, 2026

Verified execution and configuration boundaries across local Codex surfaces.

## Codex Desktop

Codex Desktop is the local Codex runtime inside the ChatGPT desktop app. Its Codex and Work experiences share the same local backend; Work tasks executing locally run on that backend, so lifecycle hooks, plugins, skills, and local configuration apply to both.

Local projects can attach one or more folders. One folder is primary:

- New chats start in the primary folder.
- Codex uses the primary folder for Git operations.
- Automatic discovery of `AGENTS.md`, skills, and `config.toml` starts from the primary folder.
- Secondary folders remain available for file search, reading, and editing, but do not drive automatic discovery.

Codex Desktop supports local plugin browsing, skill browsing, MCP configuration, and hook management. The official Commands reference documents the `codex://` deep-link scheme, including `codex://threads/new` (with `prompt`, `path`, `originUrl` query parameters), `codex://settings`, `codex://skills`, `codex://plugins/install/<plugin-name>?marketplace=<marketplace-name>` (plugin install flow), `codex://plugins/<plugin-id>` (plugin detail page), and a local-marketplace detail variant with `marketplacePath`. Deep-link handling lives in the closed-source desktop frontend — only `codex://threads/new` is verifiable in the OSS `codex-rs` repo (CLI→Desktop handoff) — so treat the documented routes as authoritative but confirm exact behavior on a real Desktop client when it matters.

## Codex CLI

Codex CLI runs against the directory where it starts unless `--cd` selects another directory. It supports:

- Interactive and non-interactive sessions
- Plugins and plugin marketplaces
- Skills
- Lifecycle hooks
- MCP servers
- Subagents
- Session resume, fork, clear, and compaction

`codex exec` uses the same configuration system for non-interactive work. It can persist sessions, resume a prior session, or run ephemerally.

## Shared Local Host State

Codex Desktop, Codex CLI, and the IDE extension share MCP configuration for the same Codex host. User configuration defaults to `~/.codex/config.toml`; trusted project configuration lives in `.codex/config.toml`.

Codex project configuration is layered from the project root down to the current working directory. Project layers are ignored when the project is not trusted. User and system layers continue to load.

Plugins are available in Codex CLI and Codex Desktop. The IDE extension does not support plugins, even though it shares other Codex facilities such as skills and MCP.

## Subagents

Current Codex releases enable subagent workflows by default in Codex Desktop, CLI, and the IDE extension. Local Codex can delegate because of a direct user request or applicable `AGENTS.md` or skill instructions.

Subagents inherit the parent session's sandbox policy. Codex orchestrates their creation, progress, completion, and result collection. CLI users can inspect agent threads with `/agent` or `/subagents`; Codex Desktop exposes subagent activity and threads graphically.

## Web Surfaces

Web Chat, ChatGPT Codex Web, and other hosted execution do not share the local execution environment. Archived research lives in [`web-research.md`](./web-research.md).

## Sources

- [ChatGPT desktop app](https://learn.chatgpt.com/docs/app)
- [Commands (deep links)](https://learn.chatgpt.com/docs/reference/commands)
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli)
- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [Plugins](https://learn.chatgpt.com/docs/plugins)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
