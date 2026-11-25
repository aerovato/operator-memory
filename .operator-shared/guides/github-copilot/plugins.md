# Copilot Plugin Packaging and Installation

Last Updated: November 22, 2026

Plugin layouts, native installation and updates for Copilot CLI and the VS Code Copilot target. CLI observations cover macOS ARM64 `1.0.114`. VS Code paths are based on its pinned upstream source and documentation.

## Package a disk-backed plugin

For the schema-tagged layout documented by GitHub, put `plugin.json` at the package root and use the exact schema URL shown below. Keep the name and release version consistent across the manifest and catalog. [Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "operator",
  "version": "0.1.0",
  "description": "Operator Memory session context and setup"
}
```

- `plugin.json` lives at the package root. A recognized standard root manifest takes precedence over alternative manifests. Member paths are fixed. A top-level legacy `hooks` or `skills` pointer in this manifest has no standard semantics.
- `skills/operator-user-init/SKILL.md` and `skills/operator-project-init/SKILL.md` are examples of portable component paths. Skill IDs can be shorter when the host already prefixes them. See [Setup commands](./commands.md).
- `com.github.copilot/hooks/hooks.json` holds native Copilot event definitions with `version: 1`. Bundle a small hook runner and resolve it through the native plugin-root environment. See [Hooks](./hooks.md).
- `com.github.copilot/commands/`, `agents/`, `rules/`, and `lsp.json` in that same namespace are client-specific components. Root `mcp.json` is optional and has its own same-version schema. Operator's current contract needs no MCP server or custom agent as an installation dependency.
- Legacy packages accept a root `plugin.json` without the Agent Plugins schema, or a recognized legacy manifest directory. The CLI checks legacy manifests in this order: `.plugin/plugin.json`, root `plugin.json`, `.github/plugin/plugin.json`, `.claude-plugin/plugin.json`. Legacy default hook files are root `hooks.json` or `hooks/hooks.json`; documented legacy path overrides belong to that format. An existing Claude or Codex marketplace can coexist in a repository without making its manifest the shared Copilot plugin manifest.
- Use the Copilot namespace for hooks with a schema-tagged manifest. In the `1.0.114` CLI probe with a `1.1.0` manifest, the namespaced startup hook ran and the root startup hook produced no invocation. VS Code's workbench parser also resolves the namespaced hook file. [VS Code format registry](https://github.com/microsoft/vscode/blob/733a99842b0e0e14c3593dfab31fff2035478ba0/src/vs/platform/agentPlugins/common/pluginParsers.ts#L233-L257)

## Preview and distribution

```sh
copilot --plugin-dir /absolute/path/to/plugin
copilot plugin install /absolute/path/to/plugin
copilot plugin list --json
copilot plugin disable operator
copilot plugin enable operator
copilot plugin uninstall operator
```

`--plugin-dir` can be repeated and leaves no installed activation entry. Use it for an isolated edit/test loop. Persistent direct installation also accepts `OWNER/REPO`, `OWNER/REPO:PATH/TO/PLUGIN`, and a Git URL. CLI `1.0.114` completed local direct installation and emitted a deprecation warning that future versions will require `plugin@marketplace`. Treat direct installation as an existing development or compatibility option. For relative development mounts, the current CLI resolves the path relative to the effective session directory after `-C`, resume, or worktree selection. Use an absolute path for a Helper preview. `COPILOT_HOME` controls the configuration home, and `COPILOT_CACHE_HOME` controls cache placement. Older `--config-dir` is deprecated. Treat the native stores and config as runtime-owned.

A catalog is distinct from the plugin manifest. Copilot CLI checks `marketplace.json`, `.plugin/marketplace.json`, `.github/plugin/marketplace.json`, and `.claude-plugin/marketplace.json`. Put the Copilot entry in a catalog file that this search finds intentionally. A relative source is resolved within its marketplace. A GitHub entry can include `repo`, `path`, `ref`, and an optional exact full `sha`. A minimal catalog for a same-repository plugin could be:

```json
{
  "name": "aerovato",
  "owner": { "name": "Aerovato" },
  "plugins": [
    { "name": "operator", "source": "./plugins/copilot" }
  ]
}
```

```sh
copilot plugin marketplace add OWNER/REPO
copilot plugin install operator@aerovato
copilot plugin update operator@aerovato
copilot plugin marketplace update aerovato
```

`marketplace add` takes the catalog's declared name as its key. Updating a catalog refreshes available entries. A plugin update refreshes installed content. Registered local directory marketplace entries with relative local sources load live from the source directory after `/restart` or a new session. Third-party marketplace session-start updates require `extraKnownMarketplaces[marketplace].autoUpdate: true` in user or managed settings. Repository entries cannot opt in. The documented CLI update runs in interactive and `-p` sessions, with trusted-working-directory and default CI restrictions. SDK/server hosts are excluded from this CLI auto-update contract. VS Code documents **Chat: Update Plugins** or **Check for and Apply Updates** in Agent Customizations. Automatic editor updates depend on the host and `extensions.autoUpdate`. VS Code documents that npm and PyPI sources require a manual update. Start a fresh session to verify refreshed hook scripts and skills.

## Scope and ownership

`copilot plugin list --json` currently emits a flat array with `name`, `enabled`, `source`, and optional `marketplace`, `version`, and `installedFrom`. Marketplace installs typically land under `$COPILOT_HOME/installed-plugins/<marketplace>/<plugin>` and direct installs under `_direct/<source-id>`. Test install, enabled state, and hook delivery separately. Avoid deriving installation identity from a guessed directory name.

Use native CLI or VS Code controls to change activation. Repository `enabledPlugins` can control a marketplace plugin, managed decisions win over local toggles, and managed-only hooks can exclude an otherwise enabled plugin. In VS Code, workspace overrides for marketplace plugins are saved under `.github/copilot/settings.json` and apply from the selected chat's working directory. Direct installs have global controls. A remote session can resolve different plugin ownership even when the UI displays the same plugin name. See [VS Code integration](./vscode.md).

The Helper should use the selected native install path and verify its result. Keep a preview identity separate from a publicly released identity where they might collide. Git-backed catalog and direct-install sources have documented CLI contracts. An existing Operator npm publication flow or a VS Code marketplace source type does not establish that a given CLI release can install the same package-source object. Validate an npm catalog entry on both hosts before adopting it.

## Verification Notes

The isolated `1.0.114` prompt-mode probe used `--plugin-dir` with legacy, 1.0, and 1.1 manifests and distinct markers in the namespaced and portable files. It used synthetic local provider requests. The [runtime checks](./injection.md#verification-notes) establish which hooks ran and what the provider received. A separate isolated direct installation returned an enabled plugin and its skill in CLI JSON inventory. Disabling it preserved the installed row with `enabled: false`. A registered local directory marketplace installed its relative-source entry as `source: "live"`. The runtime reported that the plugin directory was used in place without copying.

## Sources

- [CLI plugin and marketplace reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference) and [CLI authoring guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating).
- [VS Code authoring reference](https://code.visualstudio.com/docs/agents/reference/agent-plugin-reference) and [GitHub plugin and marketplace reference](https://docs.github.com/en/copilot/reference/plugin-and-marketplace-reference).
- `references/vscode/src/vs/platform/agentPlugins/common/agentPluginParser.ts:11–49` reads the schema-tagged root manifest for workbench use. `references/vscode/src/vs/platform/agentPlugins/common/pluginParsers.ts:233–257` resolves the Copilot namespace.
