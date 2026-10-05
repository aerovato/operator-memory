# Codex Context Facilities

Last Updated: September 14, 2026

Verified context and extension facilities other than lifecycle hooks.

## `AGENTS.md`

Codex reads `AGENTS.md` before doing work. It builds the instruction chain once per run; in the TUI this usually means once per launched session.

Discovery order is:

1. In `CODEX_HOME` or `~/.codex`, read `AGENTS.override.md` when present, otherwise `AGENTS.md`. Only the first non-empty global file is used.
2. Starting at the project root, walk toward the current working directory.
3. In each directory, select at most one file in this order: `AGENTS.override.md`, `AGENTS.md`, then configured fallback filenames.
4. Concatenate selected files from root to current directory so closer guidance appears later.

Codex skips empty files. Combined project instructions stop at `project_doc_max_bytes`, which defaults to 32 KiB. `project_doc_fallback_filenames` adds alternate names to per-directory discovery.

The instruction chain is rebuilt on a new run or TUI session. `codex debug prompt-input` can render exact model-visible prompt input for diagnosis.

## Static Codex Instructions

Codex configuration includes:

- `developer_instructions`, additional developer instructions injected into the session.
- `model_instructions_file`, a replacement for built-in instructions instead of `AGENTS.md`.
- `instructions`, reserved for future use.

User configuration lives in `~/.codex/config.toml`. Trusted project configuration can add `.codex/config.toml` from project root to current directory. CLI flags and explicit configuration overrides have higher precedence.

## MCP

Local Codex clients support stdio and streamable HTTP MCP servers. Codex Desktop, CLI, and the IDE extension share MCP configuration for one Codex host.

Supported MCP server features include:

- Tools
- Resources
- Prompts
- Server instructions
- Environment variables for stdio servers
- Bearer and OAuth authentication for HTTP servers

Codex reads the MCP initialization `instructions` field as server-wide guidance alongside that server's tools. OpenAI recommends keeping the first 512 characters self-contained for tool-selection decisions.

MCP configuration can be user-level or project-level. A server can be required, causing session startup or resume to fail if initialization fails. Plugin-provided MCP servers have plugin-scoped enablement and approval policy.

## Skills

Skills initially contribute metadata rather than their complete instruction body. The full body loads only when explicitly or implicitly selected. Skill discovery has a bounded context budget: by default, at most 2% of the model context window, or 8,000 characters when the context size is unknown.

See [`commands.md`](./commands.md) for invocation and packaging details.

## App Server

Codex app-server is the JSON-RPC interface for building a custom rich client. It exposes authentication, threads, turns, approvals, streamed events, skills, hooks, plugins, MCP, and filesystem APIs.

Relevant context controls include:

- `thread/start` and `thread/resume`
- Per-thread and per-turn configuration
- `thread/inject_items`, which appends raw Responses API items to model-visible persisted history
- Turn collaboration-mode developer instructions
- `instructionSources`, returned for loaded instruction files

App-server distinguishes thread identity from session-tree identity. Root threads use their thread ID as `sessionId`; forked threads can retain the root session ID.

App-server is for integrations that own the client protocol. It is not a plugin API for changing the official desktop or CLI client.

## Codex SDK

The TypeScript and Python SDKs create, run, continue, and resume local Codex threads. They are intended for CI, internal tools, custom agents, and application integrations. The Python SDK controls a pinned local app-server runtime; the TypeScript SDK uses the local Codex runtime.

The SDK is an automation and custom-application surface, not an official-client plugin lifecycle surface.

## Sources

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
