# Claude Code Plugins

Last Updated: October 3, 2026

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

- `name` (required) — kebab-case, must match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`; `operator` is likely too generic for marketplaces — plan a unique name and record it in the binding spec
- `version` — semver, defaults `0.1.0`
- `description` — 50-200 characters, marketplace display
- `author`, `homepage`, `repository` (string or `{type, url, directory}`), `license` (SPDX, `BSD-3-Clause`)
- `keywords`
- Component path fields — string path or inline object: `commands`, `agents`, `hooks` (default `./hooks/hooks.json`), `skills`, `outputStyles`, `mcpServers` (default `./.mcp.json`), `lspServers`
- `defaultEnabled` — start disabled if true
- `userConfig` — typed options surfaced in `/plugin` Configure options; values reach hooks via `${user_config.*}` (exec form) or `CLAUDE_PLUGIN_OPTION_<KEY>`

Relative paths must start with `./`. Components are auto-discovered from their conventional directories even without explicit fields.

## Development workflow

- `claude --plugin-dir <path>` loads a plugin directory for one session without installing — the local preview mechanism for the Operator package (analogous to `preview:opencode`)
- `/reload-plugins` reloads plugins mid-session (warns when it would invalidate the prompt cache; `--force` overrides)
- `claude plugin validate <dir>` statically validates the manifest and configuration, and for mods lists handled events and API calls. Live-verified behavior: the analyzer resolves call sites wrapped in local helper functions (e.g. `$.fs.write ... (via log)`), so non-inline-but-static calls pass; it accepts `agent.spawn` handlers; the only warning on an otherwise minimal manifest is a missing `author` field
- `claude --debug` surfaces load failures
- Mods additionally support `claude plugin test <dir>` (see [`mods.md`](./mods.md))

## Marketplaces and distribution

A marketplace is a repo or JSON file with `.claude-plugin/marketplace.json` listing plugins and sources. Accepted plugin sources include GitHub/git repos (with `#ref` pinning), npm packages, local directories, direct URLs, and `command` sources. Anthropic reserves official marketplace names (`claude-plugins-official`, etc.); third-party marketplaces cannot use them.

For Operator: a `aerovato/operator` marketplace repository (GitHub) whose `marketplace.json` points at the plugin — the same shape as the Codex local-marketplace flow. npm is also a source type, matching the workspace's npm publishing pipeline; choose per the release spec.

## Installation

In session: `/plugin install <name>@<marketplace>` (opens review UI), or the `/plugin` Discover tab. From the shell, scriptable:

```bash
claude plugin marketplace add aerovato/operator
claude plugin install <plugin-name>@aerovato/operator
```

Scopes: user (`~/.claude/settings.json`, all projects), project (`.claude/settings.json`, committed; collaborators still install once with `--scope project`), local (`.claude/settings.local.json`). Scope precedence: local > project > user. Plugins land under `~/.claude/plugins/`.

For Helper's `operator-helper install claude-code`: run the shell `claude plugin` commands (marketplace add + install, default user scope), then verify with `claude plugin list`. `--yes` accepts `command`-source confirmation prompts in scripts.

Live-verified on v2.1.287: a Helper-fabricated marketplace can use `source: "./node_modules/@aerovato/operator-claude-code"` after npm installs the adapter under that marketplace root. `claude plugin marketplace add` is repeatable for the same local path. Follow install with `claude plugin update operator@operator-memory` to refresh an existing installation. `claude plugin list --json` returns an array with `id`, `enabled`, `version`, and `installPath`; verify the matching `id` is enabled. First and repeated installs passed against a packed adapter served by a temporary npm registry in an isolated home/config environment.

Direct npm installation syntax exists (`claude plugin install <package>@npm`, with `--registry` for a custom registry), but availability is account-gated. Both unsigned isolated and signed-in v2.1.287 probes returned `failureCode: "npm_marketplace_disabled"`. No supported user setting to enable it was found in the reviewed public docs. Ordinary marketplace entries with npm plugin sources work independently of this gate; first install, repeated install, and update passed with Claude owning the fetch and cache. Operator uses this ordinary npm-source pathway through the static repository catalog, not Helper's earlier local-marketplace/cache design. See [installation pathways](./installation.md) for the complete verified source/loading distinction.

## Updates

- Marketplaces auto-update by default only for Anthropic official ones; third-party marketplaces are off by default (user can enable per marketplace in `/plugin`)
- `claude plugin update <name>@<marketplace>` updates one plugin; `claude plugin marketplace update <name>` refreshes a listing
- `${CLAUDE_PLUGIN_ROOT}` changes across updates; persistent state belongs in `${CLAUDE_PLUGIN_DATA}`
- The running session keeps loaded versions until `/reload-plugins`

Native update exists (`claude plugin update`), but it is marketplace-driven and off by default for third parties; Helper's automatic update check remains the portable path per the reference implementation. Record the division in the binding spec.

## Dependencies and policy

- Manifest `dependencies` install alongside the plugin; enable/disable/uninstall act on the chain; `claude plugin prune` removes auto-installed orphans
- `allowManagedHooksOnly` org policy blocks installed-plugin hooks (except managed force-enables); `disableAllHooks` and `--bare`/`--safe-mode` also silence the plugin. `/operator:repair` and Helper status should detect these states
- Plugins run with user privileges and are not sandboxed; the marketplace review pane shows what a plugin will install

## Reference examples

In `<reference>/claude-code-docs/plugins/`: `learning-output-style` and `explanatory-output-style` (minimal SessionStart context injection), `hookify` (command-plugin structure with Python handlers), `plugin-dev` (authoring toolkit with manifest and frontmatter references).
