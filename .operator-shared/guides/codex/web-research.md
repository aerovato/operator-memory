# Web Surface Research (Archived)

Last Updated: September 14, 2026

Archived research on non-local hosted surfaces and their local-extension limits. Research was retrieved September 14, 2026.

## Terminology

- **Web Chat** — ordinary ChatGPT conversation on web, desktop, and mobile.
- **ChatGPT Codex Web** — hosted Work/Codex execution in OpenAI's cloud (formerly researched as "hosted Work").
- **Web** — any non-local hosted surface collectively.

## Web Chat

- Chat on web, desktop, and mobile can use installed plugin skills and remote MCP-backed tools where available.
- ChatGPT projects can provide uploaded files, connected sources, and project instructions. They do not provide direct access to a local computer folder on the web.

## ChatGPT Codex Web

- Hosted Work can use installed plugins and remote MCP tools, but it does not read local Codex configuration.
- Hosted agents use the tools and environment available to the parent hosted chat rather than a local Codex sandbox.
- Hosted Work supports subagents for eligible accounts, under the same hosted-environment limits.

## Hosted Plugin Limits

- Installing a plugin on the web does not deploy hook scripts into an execution environment. Hook scripts must exist in the execution environment.
- Public MCP submission expects a remote HTTPS endpoint; local MCP support requires separate arrangements.
- Publishing a plugin makes its listing discoverable on supported ChatGPT and Codex surfaces.
- Optional MCP UI renders in ChatGPT through the MCP Apps bridge. UI is not required for headless Codex workflows.

## Sources

- [ChatGPT desktop app](https://learn.chatgpt.com/docs/app)
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Plugins](https://learn.chatgpt.com/docs/plugins)
- [MCP server](https://developers.openai.com/plugins/concepts/mcp-server)
