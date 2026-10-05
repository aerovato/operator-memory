# Codex Plugin File Formats

Last Updated: September 27, 2026

Concrete file formats for plugin creation, verified directly against the Codex Rust source (`codex-rs`). Field names are wire names (camelCase); optional unless stated.

## Legacy `.codex-plugin/plugin.json`

Only this format loads lifecycle hooks in the current source revision (see [`plugins.md`](./plugins.md)).

Fields: `name` (required), `version`, `description`, `keywords` (array), `skills`, `mcpServers`, `apps`, `hooks`, `interface`.

Path-valued fields (`skills`, `apps`, `hooks`) accept a `./`-prefixed path string or an array of path strings. Paths resolve under the plugin root and must stay inside it. `mcpServers` accepts a path string or an inline server object map.

`hooks` additionally accepts an inline hooks-file object or a list of them (see `hooks/hooks.json` below).

`interface` carries presentation metadata: `displayName`, `shortDescription`, `longDescription`, `developerName`, `category`, `capabilities` (array), `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`, `brandColor`, `composerIcon`, `logo`, `logoDark`, `screenshots` (array), `defaultPrompt`.

When `skills` is omitted, discovery defaults to `<root>/skills` (recursive for the legacy format).

Minimal legacy manifest:

```json
{
  "name": "aerovato",
  "version": "0.1.0",
  "description": "Operator Memory",
  "hooks": "./hooks/hooks.json"
}
```

## Portable root `plugin.json` (Agent Plugins)

Schema: `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`. Fields: `$schema` (required), `name` (required, validated), `version`, `description`, `author` (`{name}`), `homepage`, `repository`, `license`, `keywords`. Unknown fields are warned and ignored; `name` must be lowercase alphanumeric plus `.`/`-`, start and end alphanumeric, no `--`/`..`, max 64 chars.

Portable defaults supply `skills/` (direct children only) and `mcp.json`. Codex-specific settings come from the `extensions."com.openai"` object, whose contents are parsed with the legacy manifest parser and may set `apps`, `hooks` (parsed but currently discarded — hooks are suppressed for this format), and `interface`. A `.codex-plugin/plugin.json` beside the root manifest acts as the same extension overlay.

## `hooks/hooks.json`

Top level: `{ "description": "...", "hooks": { "<Event>": [ <group>, ... ] } }`. Event keys: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt`.

Each group: `{ "matcher": "...", "hooks": [ <handler>, ... ] }`. `matcher` is optional; `SessionStart` matches on `source` (`startup`, `resume`, `clear`, `compact`, `fork`).

Command handler:

```json
{
  "type": "command",
  "command": "node \"$PLUGIN_ROOT/scripts/hook.mjs\"",
  "commandWindows": "...",
  "timeout": 600,
  "async": false,
  "statusMessage": "...",
  "additionalContextLimit": 0
}
```

Only `type` and `command` are required. `timeout` is seconds (default 600). `additionalContextLimit` omitted means the ~2,500-token spill default; `0` passes full context to the model. An `mcp_tool` handler type also exists (`server`, `tool`, `input`).

Full example:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "echo startup", "additionalContextLimit": 0 } ] }
    ],
    "SubagentStart": [
      { "hooks": [ { "type": "command", "command": "echo subagent" } ] }
    ]
  }
}
```

The same event structure works inline in `config.toml` (`[hooks]` tables, snake_case aliases accepted for handler fields) with a `[hooks.state]` trust map keyed by `<key_source>:<event_label>:<group_index>:<handler_index>`.

## `mcp.json`

`{ "mcpServers": { "<name>": { "type": "stdio", "command": "..." } } }`. For the portable format the `$schema` `.../mcp.schema.json` key is accepted; configs must be regular files inside the plugin root (symlinks outside are rejected).

## `marketplace.json`

Located at `~/.agents/plugins/marketplace.json` or `$REPO_ROOT/.agents/plugins/marketplace.json`.

```json
{
  "name": "my-marketplace",
  "plugins": [
    {
      "name": "aerovato",
      "source": "./packages/codex",
      "policy": { "installation": "AVAILABLE" }
    }
  ]
}
```

Top level: `name` (required), `interface.displayName`, `plugins` (required). Each plugin entry: `name` (required), `source`, `policy`, `category`, plus arbitrary flattened manifest metadata fields (merged into a fallback manifest). `policy.installation` accepts `NOT_AVAILABLE`, `AVAILABLE`, or `INSTALLED_BY_DEFAULT`; use `AVAILABLE` for a plugin users may choose to install. `source` accepts:

- A path string (`"./..."` or absolute)
- `{ "source": "local", "path": "..." }`
- `{ "source": "url", "url": "...", "path": "...", "ref": "...", "sha": "..." }`
- `{ "source": "git-subdir", "url": "...", "path": "...", "ref": "...", "sha": "..." }`
- `{ "source": "npm", "package": "...", "version": "...", "registry": "..." }`

`policy.authentication` and `policy.products` are optional.

## `SKILL.md` and `agents/openai.yaml`

`SKILL.md` frontmatter: `name` (must match the directory name; defaults to it; max 64 chars), `description` (required), `short-description` (optional).

Optional `agents/openai.yaml` per skill:

```yaml
policy:
  allow_implicit_invocation: false
```

## Source Map

- Legacy manifest parsing: `core-plugins/src/manifest.rs`
- Portable manifest and extension overlay: `core-plugins/src/agent_plugin_manifest.rs`
- Hook-file and handler schema: `config/src/hook_config.rs`
- Hook loading and defaults: `core-plugins/src/loader.rs` (`hooks/hooks.json` fallback, `skills` default)
- Marketplace schema: `core-plugins/src/marketplace.rs`
- SKILL.md parser: `skills/src/parser.rs`
