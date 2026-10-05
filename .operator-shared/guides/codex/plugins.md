# OpenAI Plugins

Last Updated: September 27, 2026

Verified plugin packaging, distribution, installation, and update behavior.

## Plugin Contents

Plugins are installable packages used by ChatGPT and Codex. A plugin can contain:

- Skills
- An MCP server
- Skills and an MCP server
- Optional MCP-provided UI
- Codex lifecycle hooks

ChatGPT and Codex share a universal public plugin directory. Individual capabilities remain surface-specific, particularly local hook scripts and UI.

## Portable Package

New portable packages use `plugin.json` at the plugin root with the Agent Plugins schema. Fixed package locations provide portable components:

- `skills/` contains skill folders.
- `mcp.json` configures bundled MCP servers.
- `assets/` contains package assets.
- `extensions.com.openai` contains OpenAI presentation, registered MCP mappings, and hook configuration.

The older `.codex-plugin/plugin.json` format remains a compatibility fallback. When root `extensions.com.openai` exists, it replaces the compatibility overlay as the source of OpenAI-specific settings such as hooks, apps, and interface; portable defaults still supply skills and MCP paths, and legacy data is separately consulted for MCP environment allowlisting.

Source finding: the installed-plugin loader suppresses hooks for portable `PluginManifestFormat::AgentPlugin` manifests; only the legacy manifest format loads lifecycle hooks (`core-plugins/src/loader.rs`). **Verified on real clients (September 2026): legacy `.codex-plugin/plugin.json` plugin hooks execute correctly on shipped Codex CLI and Codex Desktop.** Use the legacy manifest for the Operator plugin.

OpenAI's built-in `@plugin-creator` or `$plugin-creator` currently scaffolds the compatibility layout. Manual authoring supports the portable root layout.

## Distribution Sources

Plugins can come from:

- The universal public directory
- A ChatGPT workspace
- A repository marketplace
- A personal marketplace
- A configured Git marketplace
- An npm-backed marketplace entry

A marketplace is a JSON catalog. Common local locations are:

- `$REPO_ROOT/.agents/plugins/marketplace.json`
- `~/.agents/plugins/marketplace.json`

Marketplace entries identify the plugin source, install policy, authentication policy, and category. Git-backed entries can select a repository, subdirectory, ref, or SHA. Npm-backed entries can select a package, version or range, and HTTPS registry.

Codex downloads npm plugin packages without running npm lifecycle scripts.

## Local Installation

Codex Desktop reads repository and personal marketplace files. For local entries, it installs a copy under:

`~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/`

Local plugin versions use `local`. The host loads the cached installation rather than the source directory. Source changes therefore require refreshing the installed copy and restarting Codex Desktop as documented.

Plugin writable data lives under `~/.codex/plugins/data/`; for legacy-format hooks it is `plugins/data/<plugin>-<marketplace>`, exposed as `PLUGIN_DATA`.

Source basis: the Rust client resolves one configurable Codex home (`CODEX_HOME`) and syncs remote-installed plugins through the ChatGPT backend; CLI and Desktop share local configuration, MCP state, and plugin state.

Codex CLI supports:

- `/plugins` for the interactive browser.
- `codex plugin` for install, list, and remove operations.
- `codex plugin marketplace` for adding, listing, upgrading, and removing marketplace sources.

Installed plugin capabilities become available in a new chat or CLI session.

Operator release installation uses a Helper-managed local marketplace whose `aerovato` plugin entry resolves `@aerovato/operator-codex@latest` from npm. Helper adds the marketplace, installs `aerovato@operator-memory`, and verifies installed/enabled state through `codex plugin list --json`. Hook trust remains a native Codex decision.

## Enablement

Plugin installation and enablement are distinct. Local-marketplace plugins can be enabled or disabled in user or project Codex configuration. A repository can configure:

```toml
[plugins."my-plugin@local-repo"]
enabled = true
```

Project plugin configuration loads only for trusted projects. Workspace-managed plugins use workspace state rather than local-marketplace enablement.

Bundled MCP servers have separate enablement and tool-approval settings. Plugin hooks have a separate trust decision and are skipped until trusted.

## Updates

Codex can upgrade configured Git marketplaces globally or by marketplace name. Marketplace refresh can install or refresh files for configured plugins even when a plugin is disabled.

The official documentation describes manual refresh and upgrade paths but does not specify a complete automatic-update contract for public or local plugins. Changed hook definitions require renewed trust because trust is tied to the definition hash.

## Web Limits

Publishing a plugin makes its listing discoverable on Web surfaces, but installing a plugin there does not deploy hook scripts into an execution environment. See [`web-research.md`](./web-research.md).

## Sources

- [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Plugins](https://learn.chatgpt.com/docs/plugins)
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
- [MCP server](https://developers.openai.com/plugins/concepts/mcp-server)
