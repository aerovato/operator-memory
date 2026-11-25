# Shared Partition Catalog

## Tree

Repository-wide Operator product knowledge published with the project.

- `README.md`
  - Description: Contributor-facing introduction to Operator Memory.
  - Read If: Do not read during normal agent work; written for newcomers without Operator installed.
- `operator.md`
  - Description: Repository tooling, engineering, documentation rules, and harness adapter development instructions.
  - Read If: Auto-injected.
- `catalog.md`
  - Description: This catalog.
  - Read If: Auto-injected.

### `specs/` - Published system contracts

- `reference/implementation.md`
  - Description: Adapter contract every harness adapter must satisfy, plus the accepted resolution, injection, failure, command, status, and installation pathways.
  - Read If: Implementing or reviewing any harness adapter.
- `reference/guides.md`
  - Description: Harness guide standard for `.operator-shared/guides/<harness>/`: relevance, completeness, verification, structure, and privacy rules.
  - Read If: Writing or reviewing any harness guide.
- `reference/release.md`
  - Description: Contributor checklist for shipping an adapter package. Maintainer release duties live in the private partition.
  - Read If: Shipping an adapter package or cutting a first release.
- `preamble.md`
  - Description: Preamble composition, instruction authority, warnings, all-or-nothing diagnostics, and the version rollout split.
  - Read If: Changing preamble composition, authority, warnings, or diagnostics.
- `commands.md`
  - Description: Command contract for User Init and Project Init and their setup guides.
  - Read If: Implementing adapter commands or changing setup workflows.
- `opencode/implementation.md`
  - Description: Frozen OpenCode V1 adapter contract and its installation and recovery behavior.
  - Read If: Checking existing OpenCode V1 behavior or recovering a legacy installation.
- `opencode-v2/implementation.md`
  - Description: OpenCode V2 binding: context-hook injection, commands, RPC-backed TUI status, and native update.
  - Read If: Implementing or changing the OpenCode V2 adapter.
- `pi/implementation.md`
  - Description: Pi binding: synthetic-message injection, commands, footer status, and native updates.
  - Read If: Implementing or changing the Pi adapter.
- `codex/implementation.md`
  - Description: Codex binding: lifecycle-hook persisted injection, skills for commands, hook trust, and marketplace installation.
  - Read If: Implementing or changing the Codex adapter.
- `deepseek/implementation.md`
  - Description: DeepSeek Harness binding: system-prompt assembly injection, commands, Web indicator, and profile installation.
  - Read If: Implementing or changing the DeepSeek Harness adapter.
- `claude-code/implementation.md`
  - Description: Claude Code binding: Helper-subprocess compose injection, spawn rewriting, command skills, and marketplace installation.
  - Read If: Implementing or changing the Claude Code adapter.
- `kiro/implementation.md`
  - Description: Kiro binding: Helper hook injection, steering-based subagent loading, skills, and Helper-owned file installation.
  - Read If: Implementing or changing the Kiro adapter.

### `guides/`

- `github-copilot/`
  - Description: GitHub Copilot CLI and VS Code guides: plugins, hooks, preamble injection, delegation, and installation.
  - Read If: Researching or implementing Operator support for GitHub Copilot.
- `antigravity/`
  - Description: Google Antigravity guides: plugins and installation, hook API and runtime, injection and compaction, delegation, and skills.
  - Read If: Preparing or implementing Antigravity support.
- `effect.md`
  - Description: Effect v4 and effect-smol source, implementation, and testing guidance.
  - Read If: Working with Effect v4 or effect-smol TypeScript code.
- `claude-code/`
  - Description: Claude Code guides: injection surfaces, settings hooks, commands, plugins, the mod API, and installation pathways.
  - Read If: Implementing the Operator Claude Code adapter or researching its plugin or mod API.
- `codex/`
  - Description: Codex guides: surfaces, hooks, plugins, file formats, and skills.
  - Read If: Implementing the Operator Codex adapter or researching Codex hooks, plugins, or skills.
- `deepseek/`
  - Description: DeepSeek Harness guides: runtime and prompt seams, plugins and commands, and profile installation.
  - Read If: Implementing the Operator DeepSeek Harness adapter.
- `kiro/`
  - Description: Kiro guides: surfaces, hooks, steering, skills, powers, and verified V3 injection behavior (`injection.md`).
  - Read If: Implementing the Operator Kiro adapter or checking verified Kiro V3 behavior.
- `opencode-v2/`
  - Description: OpenCode V2 guides: plugins, hooks, sessions, TUI, and installation.
  - Read If: Implementing the Operator OpenCode V2 adapter or researching the OpenCode V2 plugin API.
- `pi/`
  - Description: Pi extension, messaging and injection, and package installation guides.
  - Read If: Implementing the Operator Pi adapter or researching Pi extensions or packages.
