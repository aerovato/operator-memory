# Commands

Last Updated: October 5, 2026

Agent-assisted configuration of User Instructions, the Project Brain, and the Project Index. Deterministic work lives in `operator-helper`; phased agent work lives in emitted guides; harness commands orchestrate both.

Adapter registration and injection obligations are specified in [`reference/implementation.md`](./reference/implementation.md).

## Prerequisites

`operator-helper` is Operator's globally available installation and coordination entrypoint. Install a harness adapter with the matching helper subcommand (for example `operator-helper install opencode`).

## Command Contract

Every supported harness exposes these commands with the same intent and, where supported, the same names. Concrete bindings document unavoidable naming differences. Execution stays in the current conversation; Operator never switches sessions automatically. User guidance should recommend starting each command in a new conversation so the agent can focus on that setup, indexing, or repair operation with clean working context. This is workflow guidance, not a requirement to refresh the preamble after agent-authored changes.

- `/operator:user-init` — `user init`; follow the User Setup guide in its output with the user
- `/operator:project-init` — `project init`; follow the Project Setup guide in its output; after confirmation, offer to index in the current conversation or via `/operator:index` in a new conversation
- `/operator:index` — `index init`; follow the Project Index Setup guide with the user
- `/operator:repair` — `memory check`; stop when no issues are detected, otherwise fix only reported load failures without initializing uninitialized partitions, re-check, then read applicable memory documents

Each command hands the agent instructions in the current conversation without executing Helper in the adapter. The agent first runs `operator-helper version` and, when an update is available, must run `operator-helper upgrade` before continuing. It then runs the corresponding workflow operation. If Helper cannot start, the agent repairs its installation and retries the failed command without asking the user to reinvoke the harness command. If the version check or upgrade fails, the agent diagnoses and retries it. Non-zero results from a running setup operation retain their guide and failure details; memory-check failures are repair findings. Agents never invoke harness commands themselves.

Helper output is agent working context, not reproduced or specially formatted for the user. Setup commands remain dedicated harness commands wherever supported; Codex uses explicitly invoked skills because it cannot register such commands.

Helper setup operations include the applicable guide in their output. Legacy guide subcommands are empty, successful compatibility no-ops while older adapters still call them.

## User Setup

`/operator:user-init` runs User init, then the agent follows the guide in its output with the user. The guide configures the whole User Partition, not only User Instructions. Existing content remains user-owned and is never overwritten by deterministic setup.

Phases: assess and repair both core files (`operator.md`, `catalog.md`); customize User Instructions (doctrine only — cross-project skills, style guides, and workflow documents are freeform, not instructions); maintain the catalog, verifying every non-core path has a Description and Read If; offer to port existing skills into user freeform — explicitly positioned as a direct, idiomatic replacement for "Agent Skills". Setup is global: only skills the user wants available across all projects are ported; project-specific skills belong in the Project Brain. Standalone Markdown skills copy as files; artifact-backed skills (entry document plus code, images, or other artifacts) copy as entire folders. Catalogs document only the skill's entry file, never the folder as a separate item and never individual artifacts; finally, confirm both core files and newly cataloged paths.

## Project Setup

`/operator:project-init` runs Project init, then the agent follows the guide in its output with the user.

Project setup establishes partition scaffolding and placement rules. It does not populate the Project Index.

The Project Setup guide classifies the repository once as **greenfield** (new, empty, or template) or **existing** (substantive code and/or agent-facing docs). Greenfield runs stay light: prefer all-private Shared policy, optional minimal instructions, and skip migration. Existing projects keep the full path, including migration.

After the user confirms setup, the agent always offers indexing as the final step, never deferring it: index in the current conversation (the agent runs `index init` itself and follows the Project Index Setup guide), or run `/operator:index` in a new conversation. Small and medium codebases, including greenfield, are recommended to index now; large codebases are recommended a new conversation for clean context while still offering to index here.

Project setup asks whether to migrate existing agent-facing documentation into the Project Brain when the shape is existing and candidates exist. Migrated agent-facing docs that are scattered, thin, or too narrow are reshaped into Operator-style focused documents. User-facing documentation may be copied into specs but is never removed.

Deterministic setup initializes Private only. The agent creates `.operator-shared/` after the user chooses content to publish. When Shared is active and lacks `README.md`, the agent copies the canonical contributor-facing README template without replacing existing content.

## Project Index Setup

`/operator:index` runs `index init`, then the agent follows the guide in its output with the user.

Project Index population is intentionally separate from Project Setup. Index structure and maintenance behavior are specified in the Project Index guidance embedded in the fixed preamble.

## Canonical Guides

The User Setup, Project Setup, and Project Index Setup guides are defined under [`packages/helper/src/templates/`](../../packages/helper/src/templates/) and emitted by `user init`, `project init`, and `index init`.

Index and catalog document syntax is taught in the fixed preamble from core templates. Setup and index guides require agents to follow those shapes. Helper init seeds destination files from the same in-package exports. The User Setup guide embeds the operator and catalog seeds; the Project Setup guide embeds the operator and Shared README seeds so agents do not read template files from disk.

## Deferred

- Setup for future Memory components
- Additional harness integrations
