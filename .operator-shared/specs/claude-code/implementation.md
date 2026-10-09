# Claude Code Binding

Last Updated: October 5, 2026

## Scope

Runtime injection, commands, Helper installation, release automation, and user-facing documentation are implemented for Claude Code `v2.1.287+`. No status UI.

## Injection Contract

- Use the Helper subprocess and transform pathways from the [reference implementation](../reference/implementation.md). Render `operator-helper preamble` with `$.session.cwd()` lazily once per process, coalescing concurrent requests. Cache successful output and failures without invalidation across `/clear`, `/resume`, or `/branch`.
- Keep rendering in Helper: core requires Node APIs unavailable in Claude's mod runtime. Do not introduce a core portability abstraction for this adapter.
- Append the unchanged successful output as `operator:preamble` with `session` scope through `prompt.compose`. Diagnostic output is canonical successful output; do not inspect it or invent a fallback.
- Subagents receive the same cached bytes prepended to their `agent.spawn` task prompt. This reaches the first user message rather than the subagent system prompt; the parent retains its original tool-call prompt. No settings-hook fallback is implemented.
- Unexpected Helper failures inject nothing and emit one visible recovery cue per process. Compose cannot block a model call; proceeding without injection is an accepted binding consequence.
- Start one fire-and-forget `operator-helper version` check at runtime launch. An update-check failure does not prevent injection.

## Mod Constraints

The bundle imports no Node builtins or npm dependencies. Helpers receiving `$` must be declared at module top level for Claude's static analyzer; keep full API call sites and string-literal event registrations.

`disableAllHooks`, `--bare`, and `--safe-mode` suppress mod injection. Managed hook/mod policies can also restrict it. Operator does not override these controls. Existing `CLAUDE.md` instructions remain part of Claude's prompt; Operator does not write its preamble into instruction files.

## Commands

Expose `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair` as explicitly invoked skills. Skill directory names omit the `operator-` prefix because Claude supplies the plugin namespace. Disable model invocation. Do not declare `allowed-tools`; use the user's existing tool permissions.

The agent executes Helper and follows the [setup contract](../commands.md) in the current conversation. No inline shell expansion or harness-side workflow execution. Repair runs `memory check`, stops when clear, and never initializes absent partitions.

## Installation And Preview

`operator-helper install claude-code` verifies Helper availability on `PATH`, registers the static repository marketplace from `aerovato/operator-memory`, and delegates plugin installation, refresh, and enabled-state verification to Claude. The marketplace's npm source names `@aerovato/operator-claude-code`; Claude owns the package download and cache. Helper must not fabricate a local marketplace, run npm, or stage adapter files. Repeated installation updates the adapter. Native removal uses `claude plugin uninstall operator@operator-memory`.

`bun run preview:claude-code` builds and links Helper, builds the adapter, and launches Claude with the local package through `--plugin-dir`, without registering a marketplace or installing the plugin into the user's profile. A fresh process loads updated memory and plugin code.

## Release Contract

`bun run publish:claude-code -- <bump-or-version>` follows the repository's tag-driven release flow with `claude-code@v<version>`. The npm package version is the release source of truth; release preparation synchronizes `plugin.json` before committing. CI checks that both versions match the tag. The package must ship the built mod and all four skills, without generated Claude type declarations or source files. Package, Helper, and documentation requirements follow the [release checklist](../reference/release.md); first publication, trusted publishing setup, and the Helper release are maintainer duties.

Publish the static repository catalog and adapter package before verifying the hosted `operator-helper install claude-code` path in a clean environment. Local npm-source verification does not establish hosted availability. The release command has no dry-run mode; it commits, tags, and pushes, so execution requires release/push approval.
