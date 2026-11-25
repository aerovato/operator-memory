---
description: Operator Memory monorepo architecture and package navigation
read_if: Working anywhere in the committed Operator Memory project
---

# Shared Project Index

## Architecture

- Operator Memory is a Bun and TypeScript monorepo for durable context and agent-driven development on coding-agent harnesses.
- The read-only core runtime supplies shared models and preamble rendering, the helper CLI owns harness installation plus deterministic setup and validation, and thin harness adapters bind those capabilities. Unqualified OpenCode means V2; V1 remains explicitly legacy without renaming its package or source directory.

## Project Index

### `packages/` - Workspace packages

- [`claude-code/`](claude-code.md) - Claude Code mod adapter with Helper-rendered main-agent and subagent preamble injection.
- [`core/`](core.md) - Private harness-agnostic runtime for memory loading, shared models, and preamble generation.
- [`codex/`](codex.md) - Codex plugin package installed through the repository Git marketplace and npm.
- [`deepseek/`](deepseek.md) - Published DeepSeek Harness Host plugin and installable bundle package.
- [`helper/`](helper.md) - Published harness installation, explicit upgrade, setup, status, guide, Git, and Project Index lint CLI.
- [`opencode-v2/`](opencode-v2.md) - Default OpenCode adapter: context-hook preamble injection, Operator commands, and RPC-backed TUI status.
- `opencode/` - Frozen legacy adapter, runtime, and tests; directory-only coverage, no development or releases.
- [`pi/`](pi.md) - Published Pi extension adapter package.

### `references/` - Git-ignored third-party source trees

Each owning source subindex below records its upstream URL, local destination, full commit pin, tracking branch, and pinned checkout commands. Obtain only the checkouts required by the current task; [Contributing](../../CONTRIBUTING.md#reference-sources-and-indexes) explains index usage and refreshes. Public harness and library source maps:

- [`effect-smol/`](effect-smol.md) - Locally installed Effect v4 source tree used to verify implementation and testing patterns.
- [`harnesses/codex.md`](harnesses/codex.md) - OpenAI Codex CLI source map: hooks, plugins, skills, trust, session identity.
- [`harnesses/github-copilot/`](harnesses/github-copilot/overview.md) - GitHub Copilot CLI release materials, Copilot SDK, and VS Code Agent Host source maps and revision pins.
- [`harnesses/pi.md`](harnesses/pi.md) - Pi agent monorepo map focused on the coding-agent extension system.
- [`harnesses/deepseek-harness/`](harnesses/deepseek-harness/overview.md) - DeepSeek Harness reference monorepo: runtime, plugins, and distribution maps.
- [`harnesses/claude-code/docs.md`](harnesses/claude-code/docs.md) - Official anthropics/claude-code repository map: plugin examples, mod/plugin engine TypeScript API, and configuration examples.
- [`harnesses/opencode-v2/`](harnesses/opencode-v2/monorepo.md) - Canonical OpenCode source map, tracking V2 dev; entry point for focused subindexes.
- [`opentui.md`](opentui.md) - OpenTUI Solid JSX runtime and renderer reference for the OpenCode V2 TUI.

### Repository root

- `README.md` - Product positioning, installation, agent-assisted setup, everyday workflow, command reference, and documentation entrypoint.
- `CONTRIBUTING.md` - Contributor requirements: use Operator and maintain the shared brain.
- `README.zh-CN.md` - Simplified Chinese README for the Chinese-speaking DeepSeek Harness audience; cross-linked with the English README.
- `docs/getting-started.zh-CN.md` - Simplified Chinese version of the onboarding guide; the only doc besides the README with a Chinese version.
- `docs/getting-started.md` - New-user onboarding and usage guide: mechanisms, setup, daily use, directing the agent, and Brain review.
- `docs/comparison.md` - Public comparison of Operator against snippet-capture, RAG, CRUD-tool, and compression memory plugins.
- `docs/harnesses/` - Per-harness guides (OpenCode 2, OpenCode 1, Pi, Codex, Claude Code, DeepSeek Harness, Kiro): install command, verification, commands, updates, and harness-specific troubleshooting.
- `docs/architecture.md` - User-facing Brain, partition, catalog, Project Index, deterministic loading, and failure architecture.
- `docs/troubleshooting.md` - User-facing installation, status, lint, memory-check, repair, Git, Shared, harness update, and support guidance.
- `docs/assets/banner.jpeg` - Operator Memory README banner.
- `docs/assets/getting-started.jpeg` - Text-only Operator Memory banner for the onboarding guide.
- `docs/assets/change-the-loop.png` - README agent-loop promo graphic.
- `LICENSE` - BSD 3-Clause repository license.
- `.github/workflows/` - Frozen-install CI plus independent tag-driven npm provenance publishing and GitHub releases per published package.
- `.githooks/pre-commit` - Repository hook that reports quality checks and fixes formatting failures.
- `.githooks/commit-msg` - Commit-message hook requiring an area for `feat` commits.
- `scripts/check.sh` - Full-workspace or package-scoped validation runner.
- `scripts/install-opencode.ts`, `scripts/install-pi.ts`, `scripts/preview-codex.ts`, `scripts/preview-claude-code.ts` - Local development installation and preview of built adapters; `.test.ts` siblings cover the OpenCode installer.
- `scripts/publish-*.sh`, `scripts/publish-all.ts`, `scripts/sync-codex-version.ts`, `scripts/resolve-publish-version.sh` - Release automation: per-package preflight-validated tag-driven publishing, coordinated six-package publishing through one version commit, and version resolution and manifest synchronization; `.test.ts` siblings cover `publish-all`, `sync-codex-version`, and `resolve-publish-version`.
- `biome.json`, `tsconfig.json`, `vitest.config.ts` - Workspace formatting, typechecking, and test configuration.
- `.agents/plugins/marketplace.json` - Public Codex Git marketplace catalog pointing to the exact published npm plugin version.
- `.claude-plugin/marketplace.json` - Static Claude Code marketplace pointing to the published npm adapter package.
- `package.json`, `bun.lock` - Bun workspace metadata and locked dependencies; OpenCode build/install/publish commands target V2.
