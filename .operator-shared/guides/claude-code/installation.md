# Claude Code Installation Pathways

Last Updated: October 3, 2026

Verified on v2.1.287 (2026-10-02), against current official documentation and isolated CLI probes. Operator's approved distribution uses a static repository catalog pointing to the npm package, with Claude owning fetching, caching, and updates. Other pathways below are host reference only.

## Direct npm Gate

`claude plugin install @aerovato/operator-claude-code@npm` is recognized but rejected with `failureCode: "npm_marketplace_disabled"` and `Installing plugins straight from an npm registry (<package>@npm) is not enabled for this account.` The first isolated probe was unsigned; a subsequent signed-in probe against an unreachable registry returned the same gate before any package fetch. The refusal is not a missing package or npm configuration error.

The reviewed public installation, CLI, marketplace, publishing, and troubleshooting docs provide no user-facing setting to enable this gate or explanation of account eligibility. Do not tell users there is a switch they can enable. CLI help advertises gated features; syntax availability is not proof of usability.

## Persistent Distribution

- A marketplace is only a JSON catalog, not a separate service or package cache. It can live in the existing repository, be fetched as a hosted JSON URL, be read from a local directory/file, or be declared inline in `extraKnownMarketplaces` with a `settings` source.
- Marketplace plugin sources: relative directory, `github`, git `url`, `git-subdir`, `npm`, HTTPS zip `archive`, or a `command` that produces a directory.
- An npm **plugin** source is supported independently of the direct npm gate. A catalog entry `{ "name": "operator", "source": { "source": "npm", "package": "@aerovato/operator-claude-code" } }` installed, repeated installation, and updated successfully using a packed build and temporary npm registry. Claude performs the package fetch and owns its cache; Helper need not run npm or stage the plugin.
- An npm **marketplace** source is a different capability: the docs explicitly say it fails with `NPM marketplace sources not yet implemented`.
- Git sources do not run a build to produce Operator's ignored `hooks/register.js`. npm distribution already includes the built bundle; a git-backed plugin source needs a published build layout.
- A complete plugin folder under `~/.claude/skills/<name>/` auto-loads persistently as `<name>@skills-dir`. This includes hooks and namespaced skills, not just a standalone skill. Files and updates must be installed/maintained outside Claude's marketplace update flow.
- Anthropic's directory and claude.ai account/org plugin sync provide another persistent distribution channel, with submission/review requirements. They are not necessary for a self-hosted marketplace.

## Session-Only Loading

- `--plugin-dir` accepts a plugin directory, zip, or folder of plugins; already live-verified by the workspace preview.
- `--plugin-url` downloads a zip for the session.
- `CLAUDE_CODE_PLUGIN_DIRS` supplies absolute plugin paths when launch flags cannot be added.
- The Agent SDK can supply local plugin paths through its plugin option.

These do not create a persistent marketplace install. Organization policy can restrict plugin sources, skills-directory loading, or session-loading flags separately.

## Sources

- [Install and manage plugins](https://code.claude.com/docs/en/plugins/install)
- [Marketplace source reference](https://code.claude.com/docs/en/plugins/marketplace-reference)
- [Plugin CLI reference](https://code.claude.com/docs/en/plugins/cli-reference)
- [Create and load plugins without a marketplace](https://code.claude.com/docs/en/plugins/create)
- [Publishing and distribution](https://code.claude.com/docs/en/plugins/publish)
- [Troubleshooting](https://code.claude.com/docs/en/plugins/troubleshooting)
