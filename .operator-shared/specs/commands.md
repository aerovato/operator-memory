# Commands

Last Updated: November 25, 2026

Agent-assisted configuration of User Instructions, the Project Brain, and the Project Index. Deterministic work lives in `operator-helper`; phased agent work lives in emitted guides; harness commands orchestrate both.

Adapter registration and injection obligations are specified in [`reference/implementation.md`](./reference/implementation.md).

## Prerequisites

`operator-helper` is Operator's globally available installation and coordination entrypoint. Install a harness adapter with the matching helper subcommand (for example `operator-helper install opencode`).

## Command Contract

Every maintained harness exposes these commands with the same intent and, where supported, the same names. Concrete bindings document unavoidable naming differences. Execution stays in the current conversation; Operator never switches sessions automatically. User guidance should recommend starting each setup command in a new conversation.

- `/operator:user-init` — `user init`; follow the User Setup guide in its output with the user
- `/operator:project-init` — `project init`; follow the Project Setup guide in its output, including automatic indexing where applicable

Each command hands the agent instructions in the current conversation without executing Helper in the adapter. The agent first runs `operator-helper version` and, when an update is available, must run `operator-helper upgrade` before continuing. It then runs the corresponding workflow operation. If Helper cannot start, the agent repairs its installation and retries the failed command without asking the user to reinvoke the harness command. If the version check or upgrade fails, the agent diagnoses and retries it. Non-zero results from a running setup operation retain their guide and failure details. Agents never invoke harness commands themselves.

Helper output is agent working context, not reproduced or specially formatted for the user. Adapters use dedicated commands where supported and explicitly invoked skills otherwise.

Helper setup operations include the applicable guide in their output.

## Command Prompt

Each registration supplies this prompt, substituting its command description, operation, and workflow instruction. For `user init` and `project init`, the workflow instruction is to follow the corresponding emitted setup guide, including on operation failure.

```text
# {command description}

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper {operation}`. {workflow instruction}

## Recovery

- If Helper cannot start, install or repair the npm package `@aerovato/operator-helper` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If `operator-helper {operation}` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
```

## User Setup

`/operator:user-init` runs User init, then the agent follows the guide in its output with the user. The guide configures the whole User Partition, not only User Instructions. Existing content remains user-owned and is never overwritten by deterministic setup.

Phases: assess and repair both core files (`operator.md`, `catalog.md`); customize User Instructions (doctrine only — cross-project skills, style guides, and workflow documents are freeform, not instructions); maintain the catalog, verifying every non-core path has a Description and Read If; offer to port existing skills into user freeform — explicitly positioned as a direct, idiomatic replacement for "Agent Skills". Setup is global: only skills the user wants available across all projects are ported; project-specific skills belong in the Project Brain. Standalone Markdown skills copy as files; artifact-backed skills (entry document plus code, images, or other artifacts) copy as entire folders. Catalogs document only the skill's entry file, never the folder as a separate item and never individual artifacts; finally, confirm both core files and newly cataloged paths.

## Project Setup

`/operator:project-init` runs Project init, then the agent follows the guide in its output with the user.

Project setup establishes partition scaffolding, placement rules, and essential project context. All projects without an established sharing policy default to Private. The agent records that default in Private Operator Instructions and only offers sharing in the final report. The agent configures Operator Instructions from existing project sources and interviews the user only when the project's intent or essential context is unclear.

Project Init is for first-time setup. On a rerun, the agent follows existing structure and policy, checks integrity lightly, skips completed phases, and initializes only missing pieces. It reports stale or damaged content without repairing or rebuilding it unasked.

The Project Setup guide classifies the repository once as **greenfield** (new, empty, or template) or **existing** (substantive project content and/or agent-facing docs of any file type). Straightforward indexing plans run automatically in the same conversation. For a large project or a plan with multiple subindexes, the agent presents the scope and waits for approval in chat. One subagent owns each index file, including the main index. The main agent plans coverage, links completed subindexes, and runs lint. If there is nothing substantive to map or the harness cannot delegate, indexing is skipped.

Migration is offered after instruction configuration and before indexing when eligible agent-facing docs exist. The agent asks before deleting originals from instruction import or migration. For structured questions, it uses the harness's inline question tool or equivalent, regardless of its name, and asks directly otherwise. User-facing documentation may be copied into specs but is never removed.

The final report has three sections: actions and configuration, questions about optional changes and corrections, and next steps. No confirmation is required. Next steps address indexing blockers when present and offer a concrete bootstrap step for greenfield projects.

Deterministic setup initializes Private only. The agent creates `.operator-shared/` after the user chooses content to publish. When Shared is active and lacks `README.md`, the agent copies the canonical contributor-facing README template without replacing existing content.

## Project Index Maintenance

After setup, users ask the agent directly to refresh the index; the agent follows the fixed preamble's Project Index guidance.

