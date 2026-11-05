# Claude Code Plugins

Last Updated: November 4, 2026

Packaging, distribution, installation, and updates for the Operator plugin.

## Plugin layout

```text
operator/
├── .claude-plugin/
│   └── plugin.json
├── commands/           # slash command markdown
├── skills/             # SKILL.md folders, invocable as /operator:<skill>
├── hooks/
│   └── hooks.json      # SessionStart/SubagentStart command hooks
└── README.md
```

## Manifest

`.claude-plugin/plugin.json`. Fields Operator needs:

- `name` (required) — kebab-case identifier; Operator uses `operator`, giving `/operator:<skill>` command names
- `displayName` — human-readable UI title, independent of the identifier; Operator uses `Operator Memory`
- `version` — semver, defaults `0.1.0`
- `description` — 50-200 characters, marketplace display
- `author`, `homepage`, `repository` (string or `{type, url, directory}`), `license` (SPDX, `BSD-3-Clause`)
- `keywords`
- Component path fields — string path or inline object: `commands`, `agents`, `hooks` (default `./hooks/hooks.json`), `skills`, `outputStyles`, `mcpServers` (default `./.mcp.json`), `lspServers`
- `defaultEnabled` — starts enabled when true; documented default is true
- `userConfig` — typed options surfaced in `/plugin` Configure options; values reach hooks via `${user_config.*}` (exec form) or `CLAUDE_PLUGIN_OPTION_<KEY>`

For npm and other remotely fetched plugin sources, pre-install listings can read only the marketplace entry, not the package manifest. Put `displayName`, `description`, and `author` in the entry for a complete pre-install listing. Entry display fields override package fields after installation.

`icon` is supported in the package manifest for Anthropic directory listings, but Claude Code does not read it for its own UI. The field is not valid in marketplace entries. Do not copy Codex `interface.logo`, `composerIcon`, or skill `agents/openai.yaml` conventions into this adapter.

Relative paths must start with `./`. Components are auto-discovered from their conventional directories even without explicit fields.

## Development workflow

- `claude --plugin-dir <path>` loads a plugin directory for one session without installing — the local preview mechanism for the Operator package
- `/reload-plugins` reloads plugins mid-session (warns when it would invalidate the prompt cache; `--force` overrides)
- `claude plugin validate <dir>` statically validates the manifest and configuration, and for mods lists handled events and API calls. Live-verified behavior: the analyzer resolves call sites wrapped in local helper functions (e.g. `$.fs.write ... (via log)`), so non-inline-but-static calls pass; it accepts `agent.spawn` handlers; the only warning on an otherwise minimal manifest is a missing `author` field
- `claude --debug` surfaces load failures
- Mods additionally support `claude plugin test <dir>` (see [`mods.md`](./mods.md))

## Marketplaces and distribution

A marketplace is a repo or JSON file with `.claude-plugin/marketplace.json` listing plugins and sources. Accepted plugin sources include GitHub/git repos (with `#ref` pinning), npm packages, local directories, direct URLs, and `command` sources. Anthropic reserves official marketplace names (`claude-plugins-official`, etc.); third-party marketplaces cannot use them.

Operator uses the existing `aerovato/operator-memory` GitHub repository and its `.claude-plugin/marketplace.json`, with an npm plugin source naming `@aerovato/operator-claude-code`. Omitting the npm source version resolves `latest`; it does not require a catalog commit for each npm release.

## Installation

In session: `/plugin install <name>@<marketplace>` (opens review UI), or the `/plugin` Discover tab. From the shell, scriptable:

```bash
claude plugin marketplace add aerovato/operator-memory
claude plugin install operator@operator-memory
```

Scopes: user (`~/.claude/settings.json`, all projects), project (`.claude/settings.json`, committed; collaborators still install once with `--scope project`), local (`.claude/settings.local.json`). Scope precedence: local > project > user. Plugins land under `~/.claude/plugins/`.

For Helper's `operator-helper install claude-code`: run the shell `claude plugin` commands (marketplace add + install, default user scope), then verify with `claude plugin list`. `--yes` accepts `command`-source confirmation prompts in scripts.

Live-verified on v2.1.287: a Helper-fabricated marketplace can use `source: "./node_modules/@aerovato/operator-claude-code"` after npm installs the adapter under that marketplace root. `claude plugin marketplace add` is repeatable for the same local path. Follow install with `claude plugin update operator@operator-memory` to refresh an existing installation. `claude plugin list --json` returns an array with `id`, `enabled`, `version`, and `installPath`; verify the matching `id` is enabled. First and repeated installs passed against a packed adapter served by a temporary npm registry in an isolated home/config environment.

Direct npm installation syntax exists (`claude plugin install <package>@npm`, with `--registry` for a custom registry), but availability is account-gated. Both unsigned isolated and signed-in v2.1.287 probes returned `failureCode: "npm_marketplace_disabled"`. No supported user setting to enable it was found in the reviewed public docs. Ordinary marketplace entries with npm plugin sources work independently of this gate; first install, repeated install, and update passed with Claude owning the fetch and cache. Operator uses this ordinary npm-source pathway through the static repository catalog, not Helper's earlier local-marketplace/cache design. See [installation pathways](./installation.md) for the complete verified source/loading distinction.

## Updates

Documented November 4, 2026:

- Operator's third-party marketplace has auto-update off by default. Enable it through `/plugin` → Marketplaces, or the supported `autoUpdate` setting on its `extraKnownMarketplaces` entry. Helper enables this preference in user settings after installation and verification, including when a previous value was false; later user changes remain effective until Helper installation runs again.
- In interactive sessions, the background pass runs after the first message with a random delay of up to ten minutes. It refreshes enabled marketplaces and updates their installed plugins on disk. Environment and managed controls may suppress it.
- A completed background update shows `Plugin updated: <name> · Run /reload-plugins to apply`. The running session retains loaded versions until reload or restart; Operator's process-lifetime memory cache makes restart the supported refresh route for its memory.
- `claude plugin update operator@operator-memory` updates the plugin explicitly. The Installed tab offers Update now; the Marketplaces tab offers Update marketplace. Shell `claude plugin marketplace update` with no name refreshes catalogs only.
- Cache replacement normally compares the plugin manifest version first, then the marketplace entry version. Operator already synchronizes package and plugin manifest versions during release preparation and validates them in CI.
- `${CLAUDE_PLUGIN_ROOT}` changes across updates; persistent state belongs in `${CLAUDE_PLUGIN_DATA}`.

Operator's launch-time `operator-helper version` subprocess checks Helper, not the adapter. The adapter discards that subprocess result; it is not an adapter outdated-version notice.

## Dependencies and policy

- Manifest `dependencies` install alongside the plugin; enable/disable/uninstall act on the chain; `claude plugin prune` removes auto-installed orphans
- `allowManagedHooksOnly` org policy blocks installed-plugin hooks (except managed force-enables); `disableAllHooks` and `--bare`/`--safe-mode` also silence the plugin.
- Plugins run with user privileges and are not sandboxed; the marketplace review pane shows what a plugin will install

## Reference examples

In `<reference>/claude-code-docs/plugins/`: `learning-output-style` and `explanatory-output-style` (minimal SessionStart context injection), `hookify` (command-plugin structure with Python handlers), `plugin-dev` (authoring toolkit with manifest and frontmatter references).

## Sources

- [Plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference)
- [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference)
- [Plugin loading and updates](https://code.claude.com/docs/en/plugins/loading)
- [Install and manage plugins](https://code.claude.com/docs/en/plugins/install)
