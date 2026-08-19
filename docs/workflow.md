# Operator Workflow

Operator Memory turns agent work into lasting project knowledge. You assign normal development tasks; agents record, update, and shape durable documents as they work. The agent is an architect of that knowledge; you take the lead when a larger structural decision is needed.

## Onboard A Project

1. Run `/operator:user-init` in a new conversation to establish user-global working instructions.
2. Run `/operator:project-init` in a new project conversation to initialize Private and decide whether any knowledge belongs in Shared.
3. Run `/operator:index` in another new project conversation to map the repository.
4. Start a final new conversation for ordinary development.

User setup is typically a one-time step. Project setup and indexing apply per project. After a long break or a large pull that leaves the indexes badly out of date, running `/operator:index` again is reasonable.

Demo workflow: To see this workflow in practice, browse the [demo conversation](https://opncd.ai/share/2F8fjjEp) of a small [web app](https://github.com/aerovato/operator-demo-terra-js) built with Operator.

## Commands

Run each Operator command in a new conversation so the agent can focus on setup, indexing, or repair with a clean working context.

- `/operator:user-init` — Initializes or revises private user-global instructions in the current conversation.
- `/operator:project-init` — Initializes or revises project setup without overwriting existing content. It configures Private and guides optional Shared activation.
- `/operator:index` — Builds or refreshes the Project Index so future agents can navigate repository structure and applicable subsystem context. Run it after initial setup, substantial repository restructuring, or stale index discovery.
- `/operator:repair` — Diagnoses and repairs missing, malformed, or unloadable Operator context in the current conversation. See [Troubleshooting](troubleshooting.md).

## Work Normally

There is no separate memory-administration product. Give the agent the development work you actually care about. Operator orients each session with standing instructions, catalogs, and the main Project Index. The agent consults deeper Brain material, records lasting knowledge, and updates existing documents when the truth those documents own has changed.

What is recorded in the Brain is lasting understanding: specifications, architectural decisions and their rationale, project standards, research that would otherwise be repeated, hard-won failure modes and procedures, active plans, and index updates after meaningful codebase change. Not disparate snippets of rules, decisions, or facts that form no cohesive picture.

## Direct The Agent

The agent owns day-to-day recording and will usually update a document that already exists. Agents prefer the status quo. They hesitate to create a new document, consolidate two documents, split one that has grown too large, or trim one that has gone stale. Those moves need your judgment of the project's long-term needs.

Steer those structural decisions. Do not micromanage ordinary updates:

- “Write a spec for this feature before implementing it.”
- “Draft a plan for this change and record it in the Brain.”
- “Record this research so we do not repeat the investigation.”
- “These two documents overlap. Consolidate them.”
- “This document is too large. Split it.”
- “This document is stale. Trim it down to what still matters.”
- “Promote this spec to Shared so the team receives it.”

This direction matters most on a cold start. After Operator is added to an existing project, the Brain may hold little more than instructions, catalogs, and indexes. Ask the agent to write first specs for particular modules or systems. Once those documents exist, later sessions maintain them as part of ordinary work.

## Review The Brain

The Brain is ordinary Markdown. Treat it like any other project artifact when an agent's assumptions matter:

- Review `.operator-shared/` through normal Git diffs and code review.
- Open `.operator/` to inspect local project knowledge.
- Review `~/.operator/user/operator.md` when cross-project behavior needs correction.
- Ask which source informed a decision, then open that file.

When knowledge is wrong, correct the canonical document or ask the agent to correct it. The same path applies when you want a document created, consolidated, split, or removed: request it, then inspect the result.

## Partition Types

### Project Private

`.operator/` holds project-specific knowledge that should stay local: private plans and work in progress, internal research or business context, project-scoped personal guidance, and private corpora with their indexes.

Operator Helper adds the `.operator/` path to the global Git ignore on first setup.

### Project Shared

`.operator-shared/` holds project knowledge collaborators and future clones should receive: repository-wide instructions, published specifications and architecture, the main Project Index, and team standards or operational knowledge worth sharing.

Shared is ordinary repository content. Review it like code. Promote material from Private only when publication is intentional.

### User

`~/.operator/user/` holds project-agnostic instructions that should apply across projects: communication preferences, engineering and verification standards, tooling expectations, and global boundaries on agent behavior.
