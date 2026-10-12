### Antigravity Plugins, Installation, and Distribution

Last Updated: October 11, 2026

Native plugins bundle hooks, skills, rules, agents, and MCP declarations. Installation/replacement observations apply to Linux ARM64 CLI `1.3.1`/`1.3.3`; cross-application discovery and Windows execution remain unverified.

#### Package Structure

A directory with root `plugin.json` is the minimal portable package. Declare `name` and `description`; CLI names must match `^[a-zA-Z0-9-_]+$`. Graphical surfaces may infer a missing name, but a cross-surface package should not rely on that.

```json
{
  "name": "example-plugin",
  "description": "Example plugin description."
}
```

Optional components are `hooks.json`, `skills/<name>/SKILL.md`, `agents/*.md`, `rules/*.md`, and `mcp_config.json`. Operator's native hook/skill binding needs no MCP server or custom agent requirement.

Recent CLI also documents alternate `.antigravity-plugin/` and `.gemini-plugin/` manifest directories, explicit manifest skills, per-plugin data, agent-side `bin/` tools, and customization manifests (`skills.json`, `rules.json`, `agents.json`). Their full cross-surface contracts are not established. In particular, agent facilities do not establish `PLUGIN_DATA` or bin-path behavior for shell hooks; see [Runtime](./hooks.md#execution-environment).

#### Discovery and Enablement

Workspace plugins use `.agents/plugins/<name>/`. Current CLI installation and documented graphical global placement use `~/.gemini/config/plugins/<name>/`, not the older CLI-specific plugin path. CLI installation also writes `~/.gemini/config/import_manifest.json`.

Enablement authority is `plugins.<name>.enabled` in `~/.gemini/config/config.json`. Preserve unrelated settings. Plugin listings identify imports/components but omit enabled state and version in tested CLI; a listing is not proof of active model-time hook execution.

#### Native Installation

```sh
agy plugin validate /absolute/path/to/plugin
agy plugin install /absolute/path/to/plugin
agy plugin install https://github.com/<owner>/<repo>
agy plugin install <name>@antigravity-plugins-official
agy plugin list
agy plugin enable <name>
agy plugin disable <name>
agy plugin uninstall <name>
```

Local validation/install/enable/disable do not require authentication; actual agent execution does. `plugins` aliases `plugin`; interactive `/plugin` and `/plugins` provide management. Help exposes `import`, `link`, and `validate`; use `agy plugin help`, because `plugin validate --help` is interpreted as a path. Validation checks assets, not model receipt or authenticated execution.

#### Distribution and Marketplace

Native installation documents local directories, GitHub repositories, and the curated official marketplace. **No npm-source installer or arbitrary third-party marketplace is documented.** Do not assume a GitHub URL can target a monorepo subdirectory.

Marketplace inclusion uses Google's [interest form](https://antigravity.google/docs/marketplace#next-steps); self-service publication is not established. An npm-distributed adapter therefore needs Helper to acquire native assets and pass a local directory to the installer. Shared filesystem placement suggests a common artifact, not proof of discovery across applications.

#### Replacement, Updates, and Removal

Local reinstall replaces the managed directory exactly: removed source files disappear, new files appear, and disabled state is preserved. Installing from the managed destination itself is rejected. Enable changes the flag; uninstall removes the directory and enablement entry.

Marketplace automatic synchronization is documented for Antigravity 2.0. No automatic refresh/update API is established for local custom plugins. `agy update` updates the CLI binary, not a proven plugin update. `/skills reload` refreshes skill discovery, not established hook-code reload. Native install success does not establish authenticated installed-relative-runner execution or live-session loading.

#### Documentation Compatibility

- Older CLI plugin paths are superseded by the shared config path; pin the tested executable version rather than the web changelog's latest label.
- The plugin reference schema is older than recent release capabilities. The schema URL returned 404, and its embedded strict schema omits `$schema` despite examples using it. Use supported fields and native validation; do not invent compatibility fields.
- Headless help/release notes establish an unlimited default timeout, overriding the older five-minute documentation. Explicit test timeouts remain useful.

#### Verification Notes

- A minimal hooks/skills/runner fixture validated and installed without authentication, with import assets preserved. Empty-profile `/hooks` execution attempted OAuth; asset discovery alone is not live hook evidence.
- Replacement tests used isolated homes and source paths containing spaces/Unicode. Reinstall removed deleted files, added new files, retained disabled state, rejected self-installation, and uninstall cleaned the directory/flag. Listings returned `imports` with `name`, `source`, `importedAt`, and `components`; `source` was `antigravity`, not the original directory path.
- CLI `1.3.3` was obtained from the official updater and SHA-512 verified; the web changelog lagged behind the executable version. The official Unix installer's shell-configuration handoff was not exercised.
- Release changes: `1.0.2` shared plugin path; `1.1.11` enablement authority; `1.1.28` exact replacement/self-install rejection; `1.2.7` namespacing/process cleanup; `1.3.1` Windows replacement coordination; `1.3.2` alternate manifests/data/bin; `1.3.3` root `agents.json` and asset-validation fixes. Windows fixes are documented, not locally verified.

#### Sources

- [Plugins](https://antigravity.google/docs/plugins), [Marketplace](https://antigravity.google/docs/marketplace), [Skills](https://antigravity.google/docs/skills), [Headless](https://antigravity.google/docs/cli/headless).
- [Pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md).
