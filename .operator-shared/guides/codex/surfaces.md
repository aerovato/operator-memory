# Codex Surfaces

Last Updated: November 25, 2026

Execution and configuration boundaries that affect preamble resolution and subagent coverage. Verified September 14, 2026.

## Codex Desktop

Codex Desktop is the local Codex runtime inside the ChatGPT desktop app. Its Codex and Work experiences share the same local backend, so lifecycle hooks, plugins, skills, and local configuration apply to both.

Local projects can attach one or more folders. One folder is primary:

- New chats start in the primary folder.
- Automatic discovery of `AGENTS.md`, skills, and `config.toml` starts from the primary folder.
- Secondary folders remain available for file search, reading, and editing, but do not drive automatic discovery.

## Codex CLI

Codex CLI runs against the directory where it starts unless `--cd` selects another directory. `codex exec` uses the same configuration system for non-interactive work.

## Configuration

User configuration defaults to `~/.codex/config.toml` (`CODEX_HOME`); trusted project configuration lives in `.codex/config.toml`. Project layers are ignored when the project is not trusted.

Plugins are available in Codex CLI and Codex Desktop. The IDE extension does not support plugins.

## Subagents

Local Codex can delegate because of a direct user request or applicable `AGENTS.md` or skill instructions. Subagents inherit the parent session's sandbox policy. Only user-facing `ThreadSpawn` subagents receive `SubagentStart`; see [Hooks](./hooks.md#subagentstart).

## Hosted Surfaces

Web Chat, ChatGPT Codex Web, and other hosted execution do not share the local execution environment; see [Web Limits](./plugins.md#web-limits).

## Sources

- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli)
- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
