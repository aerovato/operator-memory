---
description: Operator Memory monorepo architecture and package navigation
read_if: Working anywhere in the committed Operator Memory project
---

# Shared Project Index

## Guidelines

- Index all files and directories covered by this index.
- If a directory is large or low-value, only index the directory; do not list every file.
- Split packages/modules into dedicated subindex files if large and contains non-core details.
- For each entry, provide a concise description of contents; do not provide descriptions for generic files like package.json or configs: describe with "Ditto".
- **Maintain when project files or layout change.**

## Architecture

- Operator Memory is a Bun and TypeScript monorepo for durable context and agent-driven development on coding-agent harnesses.
- The read-only core runtime supplies shared models and preamble rendering, the helper CLI owns harness installation plus deterministic setup and validation, and thin OpenCode and Pi adapters bind those capabilities to each harness.
- The workspace, core runtime, preamble renderer, helper CLI, OpenCode V1 and V2 integrations, Pi integration, Codex plugin packaging, DeepSeek Harness adapter, and Claude Code adapter are implemented.

## Project Index

### `packages/` - Workspace packages

- [`claude-code/`](claude-code.md) - Claude Code mod adapter with Helper-rendered main-agent and subagent preamble injection.
- [`core/`](core.md) - Private harness-agnostic runtime for memory loading, shared models, and preamble generation.
- [`codex/`](codex.md) - Codex plugin package with local marketplace installation infrastructure.
- [`deepseek/`](deepseek.md) - Published DeepSeek Harness Host plugin and installable bundle package.
- [`helper/`](helper.md) - Published harness installation, explicit upgrade, setup, status, guide, Git, and Project Index lint CLI.
- [`opencode/`](opencode.md) - Published OpenCode server and TUI plugin adapter for immutable session preamble injection and memory status UI.
- [`opencode-v2/`](opencode-v2.md) - Published OpenCode V2 server plugin adapter for context-hook preamble injection and Operator commands.
- [`pi/`](pi.md) - Published Pi extension adapter package.

### `references/` - Git-ignored third-party source references

- [`effect-smol/`](effect-smol.md) - Locally installed Effect v4 source tree used to verify implementation and testing patterns.

### Repository root

- `README.md` - Product positioning, installation, agent-assisted setup, everyday workflow, command reference, and documentation entrypoint.
- `README.zh-CN.md` - Simplified Chinese README for the Chinese-speaking DeepSeek Harness audience; cross-linked with the English README.
- `docs/getting-started.md` - New-user onboarding and usage guide: mechanisms, setup, daily use, directing the agent, and Brain review.
- `docs/comparison.md` - Public comparison of Operator against snippet-capture, RAG, CRUD-tool, and compression memory plugins.
- `docs/harnesses/` - Per-harness guides (OpenCode 2, OpenCode 1, Pi, Codex, Claude Code, DeepSeek Harness): install command, verification, commands, updates, and harness-specific troubleshooting.
- `docs/architecture.md` - User-facing Brain, partition, catalog, Project Index, deterministic loading, failure, and OpenCode architecture.
- `docs/troubleshooting.md` - User-facing installation, status, lint, memory-check, repair, Git, Shared, harness update, and support guidance.
- `docs/assets/banner.jpeg` - Operator Memory README banner.
- `docs/assets/getting-started.jpeg` - Text-only Operator Memory banner for the onboarding guide.
- `docs/assets/change-the-loop.png` - README agent-loop promo graphic.
- `LICENSE` - BSD 3-Clause repository license.
- `.github/workflows/ci.yml` - Frozen-install workspace quality checks.
- `.github/workflows/publish-helper.yml`, `.github/workflows/publish-opencode.yml`, `.github/workflows/publish-opencode-v2.yml`, `.github/workflows/publish-pi.yml`, `.github/workflows/publish-codex.yml`, `.github/workflows/publish-claude-code.yml`, `.github/workflows/publish-deepseek.yml` - Independent tag-driven npm provenance publishing and GitHub releases.
- `.githooks/pre-commit` - Repository hook that reports quality checks and fixes formatting failures.
- `.githooks/commit-msg` - Commit-message hook requiring an area for `feat` commits.
- `scripts/check.sh` - Full-workspace or package-scoped validation runner.
- `scripts/install-opencode.ts` - Globally registers the built local OpenCode package through a package-qualified absolute file spec.
- `scripts/install-pi.ts` - Persistently registers the built local Pi package through its absolute package-root path.
- `scripts/preview-opencode.ts` - Self-contained local V2 preview: builds and links Helper (`install:helper`), builds the dev-ID plugin bundle, then generates project-local V2 server configuration shadowing any global registration of the same plugin.
- `scripts/preview-codex.ts` - Self-contained local Codex preview: builds and links Helper, builds the plugin package, then registers the repository marketplace and installs or refreshes the local `aerovato@operator-local` plugin.
- `scripts/preview-claude-code.ts` - Builds and links Helper, builds the Claude Code adapter, and launches Claude with the local package through `--plugin-dir`.
- `scripts/publish-helper.sh`, `scripts/publish-opencode.sh`, `scripts/publish-opencode-v2.sh`, `scripts/publish-pi.sh`, `scripts/publish-codex.sh`, `scripts/publish-claude-code.sh`, `scripts/publish-deepseek.sh` - Preflight-validated package check, build, version, lockfile, commit, tag, and atomic push release automation; accepts semantic bump names, `X.Y.Z`, or `vX.Y.Z`. Claude Code also synchronizes its plugin manifest version.
- `scripts/resolve-publish-version.sh`, `scripts/resolve-publish-version.test.ts` - Shared semantic bump resolution and focused validation coverage for package releases.
- `biome.json`, `tsconfig.json`, `vitest.config.ts` - Workspace formatting, typechecking, and test configuration.
- `.opencode/opencode.json` - Ignored project-local V2 plugin configuration generated by `bun run preview:opencode`.
- `.agents/plugins/marketplace.json` - Local Codex marketplace entry for installing the workspace plugin package during development.
- `.claude-plugin/marketplace.json` - Static Claude Code marketplace pointing to the published npm adapter package.
- `package.json`, `bun.lock` - Bun workspace metadata and locked dependencies.
