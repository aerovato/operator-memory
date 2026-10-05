# Kiro Powers (Agent Plugins)

Last Updated: October 4, 2026

Powers are Kiro's plugin distribution format, following the open Agent Plugins specification (`agent-plugins.org`). They activate dynamically by keyword matching instead of loading upfront.

## Package layout

```text
power-<name>/
├── plugin.json   # required manifest
├── mcp.json      # optional MCP servers
├── skills/       # optional Agent Skills
│   └── <skill>/SKILL.md
└── dev.kiro/     # optional Kiro-specific extensions (e.g. steering files)
```

`plugin.json` required fields: `$schema` (`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`), `name` (kebab-case; used internally — changing it after install may require reinstall), `version`, `description`, `author.name`, `keywords` (activation triggers). Optional: `author.email`/`author.url`, `homepage`, `repository`, `license`.

`mcp.json` uses the Agent Plugins MCP schema (`mcpServers` with stdio/http entries); Kiro namespaces bundled server names on install (e.g. `supabase-local` becomes `power-supabase-supabase-local`) and managed servers are not written to `~/.kiro/settings/mcp.json`.

## Installation

- IDE: powers panel (registry one-click, **Add Custom Power** from GitHub URL or local folder), update via **Check for updates**
- CLI V3 chat: `/powers install <name|path>` (local directory must contain `plugin.json` or legacy `POWER.md`), `/powers uninstall <name>`
- Terminal: `kiro-cli powers install <name|path>` / `kiro-cli powers uninstall <name>` (no chat; next session picks up changes)
- Web: Settings > Powers catalog/upload

Installed powers live under `~/.kiro/powers/` — global only, no project scope.

Legacy `POWER.md` powers still work; new powers should use Agent Plugins.

## Relevance for adapters

Powers are the marketplace-style packaging and distribution layer: a power can bundle skills (slash-command workflows) plus optional MCP tools and Kiro steering extensions under `dev.kiro/`. For a pure filesystem/hook adapter like Operator, powers are an optional future distribution channel rather than a requirement — skills and hooks work as plain files without them.
