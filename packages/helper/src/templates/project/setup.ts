import { PROJECT_OPERATOR_TEMPLATE } from "./operator.ts";
import { PROJECT_SHARED_README_TEMPLATE } from "./shared-readme.ts";

export const PROJECT_SETUP_TEMPLATE = `# Project Setup

You are helping the user configure the Operator Project Brain across the private \`.operator/\` partition and shared \`.operator-shared/\` partition.

## Initialization and Existing Setup

Project Init is for first-time configuration. The phases below assume the partition is unconfigured. Missing files and fresh Helper seeds are normal starting points.

If setup already exists, follow its structure and sharing policy, check integrity lightly, and skip completed phases. For a partial setup, run only the phases needed to initialize missing pieces. Keep existing content in place; report stale or damaged files rather than repairing or rebuilding them as part of init. For an existing index, a structural lint check and a spot-check of links and coverage are enough; keep and skip a current index. At the end, report the findings and ask what the user wants changed.

Use the harness's inline question tool or equivalent for structured prompts, regardless of what the tool is named. If no equivalent is available, ask directly in chat and wait for the answer. Use direct chat always for free-response prompts.

**Document syntax:** Index and catalog structure, entry syntax, and examples are defined in the fixed preamble (Project Index and Partition Catalog sections). **You must follow that preamble document syntax** when creating or filling indexes and catalogs. Do not invent layouts. \`operator-helper project init\` seeds Private core files with the canonical syntax; fill or rewrite from the preamble. Operator Instructions and Shared README seeds are in the Canonical Seeds section below.

## Project Shape

Before Phase 1, classify the repository once. Do not reclassify later.

Quick scan only:

- Top-level layout and whether there is substantive project content (code, documents, data, media, or other files) versus an empty, scaffolded, or template tree
- Whether agent-facing documentation exists (\`AGENTS.md\`, \`CLAUDE.md\`, \`specs/\`, \`memory/\`, \`CONTEXT.md\`, and similar)

Set one label for the rest of this guide:

- **greenfield** — new, empty, scaffolded, or lightly built project; little or no substantive project content; nothing worth migrating into the brain
- **existing** — substantive project content and/or agent-facing docs worth considering

Greenfield defaults (apply for the whole run unless the user overrides):

- If there is nothing substantive to map, skip indexing.

## Phase 1: Configure Instructions

Operator Instructions (\`operator.md\`) capture the project's purpose, essential context, and established project-specific rules. The seed headings are prompts, not a required outline; unused placeholders don't belong in the finished file. Accurate existing instructions remain in place. Shared instructions contain only repository-wide context and doctrine suitable for publication. Private instructions contain local context, doctrine, and overrides.

The default for every project without an established sharing policy is to keep all Operator content Private. Record that rule in \`.operator/operator.md\`. The final report is the first time to offer sharing.

Task: Configure Operator Instructions. Read the README, \`AGENTS.md\`, \`CLAUDE.md\`, and other applicable project instruction sources, such as contribution, style, or workflow guides. When the project's intent and essential context are clear, configure \`operator.md\` directly. Carry over applicable project-specific rules without repeating User Instructions or inventing rules to fill the seed. Leave agent knowledge documents such as \`specs/\`, \`memory/\`, \`plans/\`, and \`context/\` for the migration phase.

If the purpose or essential context is unclear (such as in a greenfield project), interview the user before writing. Ask focused questions about what they are building and any context needed to understand it. Group related questions. A greenfield project with a clear README does not need an interview; an empty project with no stated purpose does.

If you incorporate existing instructions, use the inline question tool to ask whether to keep or delete the originals. Keep them unless the user approves deletion. Ask about authority only when sources conflict and the conflict cannot be resolved from existing context.

## Phase 2: Existing Agent Documentation

Skip this phase when the repository has no existing agent-facing documentation worth considering.

Task: Look for existing agent documentation that Operator would supersede. Common locations include \`specs/\`, \`memory/\`, \`plans/\`, \`context/\`, \`CONTEXT.md\`, and \`MEMORY.md\`. Inspect enough to tell agent-facing framework docs from user-facing product documentation.

Do not treat instruction files already handled in Configure Instructions as candidates here.

Use the inline question tool to ask whether the user wants to migrate any of these documents into the Project Brain. Offer the found candidates plus a skip choice.

After the user chooses:

- Place migrated content in freeform brain paths (\`specs/\`, \`research/\`, \`plans/\`, or similar). Default to Private unless the sharing policy includes durable project documentation.
- If the source is not Operator style, reshape it during migration. Operator documents are focused and cohesive around a feature, module, or subsystem. Rectify docs that are scattered, one-line notes, a few thin paragraphs, or too narrow to stand alone: consolidate related material into the document a future session would open for that work, drop trivia already obvious from code, and write present-tense system truth. Keep content as-is only when it already meets that standard. Do not put migrated docs in the Project Index.
- After migrating agent-facing documentation, use the inline question tool to ask whether to keep or delete the originals. Keep them unless the user approves deletion.
- User-facing documentation such as a \`docs/\` directory or docs site may be read and useful material copied into brain specs. Do not remove or relocate those originals.

## Phase 3: Index the Project

Indexing starts within Project Init after migration without a separate opt-in or final confirmation. Skip only when the project has nothing substantive to map; any file type counts. If the harness cannot delegate to subagents, leave the index untouched and report that limitation. The main agent does not write an index as a fallback.

### Plan and Delegate

Use the repository scan already done during setup. Inspect the top-level layout, READMEs, and relevant manifests only as needed to decide the structure. Detailed exploration belongs to the workers.

- The index covers the main project content, not the Brain or unrelated trees. Use the established sharing policy to select the destination. Keep existing private corpora separate from the publishable content. Default to Private when there is no policy or established destination; ask only if the available information leaves the destination unclear.
- Prefer one main index and no subindexes when it gives the project a clear map. Use subindexes for substantial areas with clear boundaries, not simply because there are many files. Preserve useful existing boundaries.
- For a large project or a plan with multiple subindexes, present the proposed index files, their partitions, and their coverage in chat. Ask for approval or changes as a free-response prompt and wait for approval before dispatching workers. Straightforward plans proceed automatically.
- Assign exactly one worker per index file, including the main index. Each worker owns one file and a distinct area of detailed coverage. The main-index worker covers project-wide architecture and navigation plus any paths not covered by a subindex.
- Use the same prompt below for every worker. Fill in the assignment only; workers already have the fixed preamble. Do not repeat it or pass the full setup conversation. Independent workers can run in parallel.

### Index Worker Prompt

\`\`\`text
You own one Project Index file. Create or update that file only. Do not edit other indexes, Brain documents, or project files.

Assignment
- File: {index file path}
- Kind and partition: {main or subindex; Private or Shared}
- Coverage: {paths you own, any exclusions, and areas covered by other workers}

Read the assigned index if it exists. Explore the assigned coverage using file and directory listings, READMEs, manifests, and entrypoints where present. Open files only when needed to understand the structure or describe a path accurately. Read briefly, such as a snippet or the first page, instead of entire files, and never read large files such as PDFs, documents, or artifacts in full. Stay within the assigned coverage for detailed exploration.

Follow the Project Index guidance and document shape in your fixed preamble. Preserve accurate entries, update stale ones, add missing coverage, and remove dead paths and placeholders. Group similar files, use Ditto for generic files, and use directory-only entries for large or low-value trees.

If assigned the main index, describe project-wide architecture and navigation without repeating subindex inventories. The main agent will link completed subindexes.

Reply with the file written and any coverage gaps or blockers. Do not paste the index into your reply.
\`\`\`

### Link and Verify

After the workers return, link completed subindexes from their partition's main index. The main agent's only index edits are to those links. Run \`operator-helper index lint\` and check that the links point to the intended files. Send content fixes back to the responsible worker instead of redoing its exploration or writing. Include the indexing and lint results, or any blockers, in the final report.

## Phase 4: Catalog

Populate the catalog for each partition being initialized. If this run added or migrated Brain documents into an existing partition, catalog those changes too. Catalog each partition independently. Catalog Brain content, not repository source code.

**You must follow the Partition Catalog document syntax from the fixed preamble** (required shape, Description / Read If entries, coverage rules).

## Phase 5: Final Report

Give the user a concise report with three sections:

### Actions and Configuration

- Project shape used for this run (greenfield or existing)
- What was done and which files were created, configured, or cataloged
- On reruns, what was already configured and any missing, stale, or damaged content noticed during the light check
- Project context, agent rules, and workflows configured in Operator Instructions
- Private / Shared placement policy, what is shared, and any unresolved boundary concerns
- Existing project instructions incorporated or left authoritative elsewhere (omit when none)
- Specs and other Brain documents added, migrated, or left in place (omit when none)
- Index written and lint result, existing index retained, or why indexing was skipped or incomplete

### Questions

Ask whether the user wants anything changed: share selected content, add project instructions, or correct a finding. When offering sharing, briefly explain that Shared content can be tracked in Git alongside the project, so teammates and their agents can use the same project instructions, index, or docs. Private content stays local. No confirmation is required to finish Project Init.

If the user wants to share, clarify which content they want in Shared. Create \`.operator-shared/\` only as needed, seed its contributor README from the embedded template if missing, and record the resulting policy in the applicable Operator Instructions. Update the affected files and maintain their catalogs automatically. If the user chooses to share the main index, follow the indexing rules to delegate moving its publishable coverage to Shared without duplicating it or exposing private-only paths.

### Next Steps

Offer the next steps that apply once Project Init and any requested configuration changes are complete:

- If indexing was blocked, identify what is needed to finish it, such as running Project Init in a harness that supports subagents.
- For greenfield projects, offer a concrete step to get the project started, such as initializing a framework or outlining the first document. Do not start that work unless the user asks.

## Canonical Seeds

When creating these files, start from the matching seed.

### Operator Instructions

\`\`\`markdown
${PROJECT_OPERATOR_TEMPLATE.trimEnd()}
\`\`\`

### Shared README

\`\`\`markdown
${PROJECT_SHARED_README_TEMPLATE.trimEnd()}
\`\`\`
`;
