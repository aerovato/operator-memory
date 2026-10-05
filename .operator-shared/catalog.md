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
  - Description: Complete adapter contract every harness adapter must satisfy, plus the accepted reference implementation shapes: resolution and injection pathways, failure semantics, commands, status, installation, and runtime shape.
  - Read If: Implementing or reviewing any harness adapter.
- `reference/release.md`
  - Description: Contributor checklist for shipping an adapter package — package shape, Helper integration, documentation, and release automation. Maintainer release duties live in the private partition.
  - Read If: Shipping an adapter package or cutting a first release.
- `preamble.md`
  - Description: Preamble composition, injection order, instruction authority, catalogs and index injection, all-or-nothing diagnostics, and conditional warnings.
  - Read If: Changing preamble composition, authority, warnings, or diagnostics.
- `commands.md`
  - Description: Command contract for the four Operator workflows (`user-init`, `project-init`, `index`, `repair`) and the User, Project, and Project Index setup workflows they orchestrate.
  - Read If: Implementing adapter commands or changing setup workflows.
- `opencode/implementation.md`
  - Description: OpenCode V1 binding — session-cached core rendering, slash commands, TUI status, client bridge, and update ownership.
  - Read If: Implementing or changing the OpenCode V1 adapter.
- `opencode-v2/implementation.md`
  - Description: OpenCode V2 binding — context-hook injection, commands, RPC-backed TUI status, native update, and harness notes.
  - Read If: Implementing or changing the OpenCode V2 adapter.
- `pi/implementation.md`
  - Description: Pi binding — synthetic-message injection, commands, footer status, and native package updates.
  - Read If: Implementing or changing the Pi adapter.
- `codex/implementation.md`
  - Description: Codex binding — lifecycle-hook persisted injection, the immutability exception, skills for commands, hook trust, and marketplace installation.
  - Read If: Implementing or changing the Codex adapter.
- `deepseek/implementation.md`
  - Description: DeepSeek Harness binding — system-prompt assembly injection, commands, Web indicator, and profile installation.
  - Read If: Implementing or changing the DeepSeek Harness adapter.
- `claude-code/implementation.md`
  - Description: Claude Code binding — Helper-subprocess compose injection, spawn rewriting, command skills, and marketplace installation.
  - Read If: Implementing or changing the Claude Code adapter.
- `kiro/implementation.md`
  - Description: Kiro binding — Helper hook injection, steering-based subagent loading, skills, and plugin-owned file installation.
  - Read If: Implementing or changing the Kiro adapter.

### `guides/`

- `effect.md`
  - Description: Effect v4 and effect-smol source, implementation, and testing guidance.
  - Read If: Working with Effect v4 or effect-smol TypeScript code.
- `claude-code/`
  - Description: Claude Code porting guides — injection surfaces, settings hooks, commands/skills, packaging, installation pathways, and the in-process mod API.
  - Read If: Planning or implementing the Operator Claude Code adapter.
- `codex/`
  - Description: Codex host, plugin, hook, skill, and context research plus archived Web-surface notes.
  - Read If: Researching or implementing a Codex integration.
- `deepseek/`
  - Description: DeepSeek Harness research on runtime, preamble injection, commands, installation, and validation.
  - Read If: Planning or implementing the DeepSeek Harness adapter.
- `kiro/`
  - Description: Kiro research — surfaces, hooks, steering, skills, powers, agents, and verified V3 injection behavior (`injection.md`).
  - Read If: Researching or implementing the Kiro adapter or checking verified Kiro V3 behavior.
- `opencode-v1/`
  - Description: OpenCode v1 plugin documentation, messaging behavior, and V1/V2 SDK reference (SDK versions relate to OpenCode V1 only).
  - Read If: OpenCode v1 harness guidance beyond the committed adapter implementation.
- `opencode-v2/`
  - Description: OpenCode V2 plugin, hook, session, TUI, and installation guides.
  - Read If: Researching or implementing an OpenCode V2 integration.
- `pi/`
  - Description: Pi extension authoring, injection semantics, and package installation guides.
  - Read If: Porting the Operator plugin to Pi or researching Pi extensions or packages.

### `references/`

- `effect-smol/`
  - Description: Locally installed, Git-ignored Effect v4 reference source tree used by the Effect guide.
  - Read If: Verifying Effect APIs, examples, tests, or source conventions.
