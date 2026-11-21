import { PROJECT_OPERATOR_TEMPLATE } from "./operator.ts";
import { PROJECT_SHARED_README_TEMPLATE } from "./shared-readme.ts";

export const PROJECT_SETUP_TEMPLATE = `# Project Setup

You are helping the user configure the Operator Project Brain across the private \`.operator/\` partition and shared \`.operator-shared/\` partition.

Configure the Project Brain and index straightforward codebases in the current conversation. Ask only for decisions that cannot be made from existing context or defaults.

Use the harness's inline question tool or equivalent for structured prompts, regardless of what the tool is named. If no equivalent is available, ask directly in chat and wait for the answer. Use direct chat always for free-response prompts.

**Document syntax:** Index and catalog structure, entry syntax, and examples are defined in the fixed preamble (Project Index and Partition Catalog sections). **You must follow that preamble document syntax** when creating or filling indexes and catalogs. Do not invent layouts. \`operator-helper project init\` seeds Private core files with the canonical syntax; fill or rewrite from the preamble. Operator Instructions and Shared README seeds are in the Canonical Seeds section below.

## Project Shape

Before Phase 1, classify the repository once. Do not reclassify later.

Quick scan only:

- Top-level layout and whether there is substantive app or library code versus an empty, scaffolded, or template tree
- Whether agent-facing documentation exists (\`AGENTS.md\`, \`CLAUDE.md\`, \`specs/\`, \`memory/\`, \`CONTEXT.md\`, and similar)

Set one label for the rest of this guide:

- **greenfield** — new, empty, scaffolded, or lightly built project; little or no substantive application or library code; nothing worth migrating into the brain
- **existing** — substantive code and/or agent-facing docs worth considering

Greenfield defaults (apply for the whole run unless the user overrides):

- Keep all content Private unless the user has already established a sharing policy. Offer sharing at the end, not during setup.
- Skip agent-documentation migration
- If there is no project code, skip indexing.

## Phase 1: Inspect the Brain

Quickly inspect the existing core files in both partitions. Fresh seeds and missing optional Shared files are normal.

- Fix routine issues without asking, such as missing catalog entries or index frontmatter. Preserve existing content and make repairs in the relevant later phase when it will touch the file. Include repairs in the final report.
- If an existing file is unreadable or cannot be safely repaired without discarding content or guessing what it meant, leave it untouched, explain the problem, and ask directly in chat before replacing it.

## Phase 2: Shared Policy

Follow an established sharing policy without asking again. For greenfield projects without a policy, record the Private default in \`.operator/operator.md\` and skip the question below.

Task: Use the inline question tool with multiple selection to ask what, if anything, the user wants published through \`.operator-shared/\`. Offer reasonable choices including:

- Keep all Operator content private
- Share the main project index
- Share project-wide rules & style guides
- Share durable project documentation
- Share plans, specifications, or research selectively

Do not ask whether to share \`catalog.md\`; \`catalog.md\` should be automatically maintained when a partition is active.

After the user chooses:

- If the user chooses to share content, create \`.operator-shared/\` and seed new shared files as needed.
  - If \`.operator-shared/README.md\` is missing, write it from the embedded Shared README seed. Preserve an existing README.
  - For shared \`operator.md\`, start from the embedded Operator Instructions seed when creating a new file.
  - For shared catalog or index files, write using the fixed preamble document syntax.
  - Record the content that the user wishes to share in \`.operator-shared/operator.md\`
  - Record the content that the user wishes to keep private in \`.operator/operator.md\`
- If the user wants to keep everything private:
  - Record that the user wishes to keep everything private in \`.operator/operator.md\`
  - If \`.operator-shared/\` exists, ask the user what they wish to do with the brain contents. (Options: Remove, merge with private, keep)

## Phase 3: Configure Instructions

Operator Instructions (\`operator.md\`) capture the project's purpose, essential context, and established project-specific rules. The seed headings are prompts, not a required outline; unused placeholders don't belong in the finished file. Accurate existing instructions remain in place. Shared instructions contain only repository-wide context and doctrine suitable for publication. Private instructions contain local context, doctrine, and overrides.

Task: Configure Operator Instructions. Read the README, \`AGENTS.md\`, \`CLAUDE.md\`, and other applicable project instruction sources, such as contribution, style, or workflow guides. When the project's intent and essential context are clear, configure \`operator.md\` directly. Carry over applicable project-specific rules without repeating User Instructions or inventing rules to fill the seed. Leave agent knowledge documents such as \`specs/\`, \`memory/\`, \`plans/\`, and \`context/\` for the migration phase.

If the purpose or essential context is unclear (such as in a greenfield project), interview the user before writing. Ask focused questions about what they are building and any context needed to understand it. Group related questions. A greenfield project with a clear README does not need an interview; an empty project with no stated purpose does.

If you incorporate existing instructions, use the inline question tool to ask whether to keep or delete the originals. Keep them unless the user approves deletion. Ask about authority only when sources conflict and the conflict cannot be resolved from existing context.

## Phase 4: Existing Agent Documentation

Skip this phase when project shape is greenfield, or when the repository has no existing agent-facing documentation worth considering.

Task: Look for existing agent documentation that Operator would supersede. Common locations include \`specs/\`, \`memory/\`, \`plans/\`, \`context/\`, \`CONTEXT.md\`, and \`MEMORY.md\`. Inspect enough to tell agent-facing framework docs from user-facing product documentation.

Do not treat instruction files already handled in Phase 3 as candidates here.

Use the inline question tool to ask whether the user wants to migrate any of these documents into the Project Brain. Offer the found candidates plus a skip choice.

After the user chooses:

- Place migrated content in freeform brain paths (\`specs/\`, \`research/\`, \`plans/\`, or similar). Follow the Shared Policy from Phase 2. Default to Private unless the user already chose to share durable project documentation.
- If the source is not Operator style, reshape it during migration. Operator documents are focused and cohesive around a feature, module, or subsystem. Rectify docs that are scattered, one-line notes, a few thin paragraphs, or too narrow to stand alone: consolidate related material into the document a future session would open for that work, drop trivia already obvious from code, and write present-tense system truth. Keep content as-is only when it already meets that standard. Do not put migrated docs in the Project Index.
- After migrating agent-facing documentation, use the inline question tool to ask whether to keep or delete the originals. Keep them unless the user approves deletion.
- User-facing documentation such as a \`docs/\` directory or docs site may be read and useful material copied into brain specs. Do not remove or relocate those originals.

## Phase 5: Index the Project

Skip if there is no project code to index. If the codebase is too large for one indexing agent, defer indexing and offer the separate Project Index Setup workflow as a next step.

For greenfield and small codebases that one indexing agent can handle, run \`operator-helper index init\` and follow the Project Index Setup guide in its output. Use the established sharing policy to select the destination. If the destination is unclear, ask only about that decision before writing.

For this automatic indexing pass, do not ask whether to start, wait for approval of the index plan, delegate to subagents, or ask for a separate final confirmation. Determine the structure, write the index, run \`operator-helper index lint\`, and include the result in the final report. Keep Helper output as working context. These exceptions apply only to Project Init, not the standalone Project Index Setup workflow.

## Phase 6: Catalog

Run this phase when the Partition Catalog \`.operator/catalog.md\`/\`.operator-shared/catalog.md\` is unconfigured or out of date.

Task: For each active partition: Populate or update the Partition Catalog from the contents and structure of the corresponding partition (\`.operator/\` or \`.operator-shared/\`). Catalog each partition independently. Catalog brain content, not repository source code.

**You must follow the Partition Catalog document syntax from the fixed preamble** (required shape, Description / Read If entries, coverage rules).

## Phase 7: Final Report

Give the user a concise report with three sections:

### Actions and Configuration

- Project shape used for this run (greenfield or existing)
- What was done and which files were created, repaired, updated, or cataloged
- Project context, agent rules, and workflows configured in Operator Instructions
- Private / Shared placement policy, what is shared, and any unresolved boundary concerns
- Existing project instructions incorporated or left authoritative elsewhere (omit when none)
- Specs and other Brain documents added, migrated, or left in place (omit when none)
- Index written and lint result, or why indexing was skipped or deferred

### Questions

Ask whether the user wants any non-default configuration: share selected content, add project instructions, or correct the setup. For a new Private-only project, this is the first sharing offer. If the user chooses to share, apply the Shared Policy rules to their selection and update the affected files and catalogs. If they choose to share the main index, move its publishable coverage to Shared without duplicating it or exposing private-only paths. No confirmation is required to finish Project Init.

### Next Steps

Offer the next steps that apply once Project Init and any requested configuration changes are complete:

- If there is project code but it has not been indexed, offer separate indexing in a new conversation using the harness's Project Index Setup workflow.
- For greenfield projects, offer a concrete step to get the project started, such as initializing a framework or installing dependencies. Do not start that work unless the user asks.

## Canonical Seeds

When creating or restoring these files, write the matching body.

### Operator Instructions

\`\`\`markdown
${PROJECT_OPERATOR_TEMPLATE.trimEnd()}
\`\`\`

### Shared README

\`\`\`markdown
${PROJECT_SHARED_README_TEMPLATE.trimEnd()}
\`\`\`
`;
