export const PROJECT_INDEX_SETUP_TEMPLATE = `# Project Index Setup

You are helping the user build or refresh the Operator Project Index — the living map of **codebase** structure and intent under \`.operator/index/\` and/or \`.operator-shared/index/\`.

Only populate or update the **main project code** index. Do not put brain layout, doctrine, specs, plans, or setup metadata in the index. You may re-run \`operator-helper index status\` and \`operator-helper index lint\` as needed.

**Document syntax:** Main-index and subindex structure, entry syntax, and examples are defined in the fixed preamble (Project Index section). **You must follow that preamble document syntax** when creating or filling every index file. Do not invent layouts. Write files directly from the preamble shapes (init may already have seeded a main index with canonical syntax).

## Goals

- Accurate, navigable map of code corpora
- Main index = must-know architecture and navigation
- Subindexes = large or non-core areas (packages, modules)
- Preserve useful existing index content
- Dual indexes mostly mutually exclusive; Shared index never describes private-only paths

## Out of scope

- \`.operator/\` / \`.operator-shared/\` brain structure → Brain structure belongs to the Partition Catalog
- Non-project code and private corpora (unless the user explicitly expands scope)

## Phase 1: Orient

Read when present:

- Status listings from \`operator-helper index status\`
- \`.operator/operator.md\` and \`.operator-shared/operator.md\` (placement / share policy)
- All existing files under \`.operator/index/\` and \`.operator-shared/index/\`

Decide write targets:

- Only one index root (\`<partition>/index/\`) exists → that root is the main codebase map
- Both exist → Shared = publishable main codebase; Private = private corpora only; keep coverage mostly mutually exclusive
- No index root yet → default to Private (\`.operator/index/\`) unless policy/user says otherwise
- Default scope: main project code only; ignore non-project trees and private corpora unless the user asks

If partition choice is ambiguous, ask for user selection via \`question\` tool, then continue.

## Phase 2: Light Explore

Task: Explore enough structure to **plan** index structure; don't fill yet.

- Use existing index content as a guide when present; ignore bare stubs
- List project top-level (e.g. \`.\`, \`src/\`, \`packages/\`); skip non-project paths
- Detect monorepo/package layout from manifests and directory names
- Read READMEs or obvious entrypoints
- Read files **sparingly**; use directory structure over reading entire file bodies
- Note candidate subindex boundaries and any .gitignored private corpora
- Do **not** deeply inventory files in this phase

## Phase 3: Plan Structure

Propose a short plan:

- Which partition(s) will be written
- Main index scope
- If using subindexes: each planned subindex file, title, and coverage
- If updating stale indexes: Proposed rebuild or restructure of existing indexes
- If moving index locations: Final private vs shared coverage

**Confirm the plan with the user before writing.** The user may change targets, subindex split, or depth. Do not start Phase 4 until they approve.

## Phase 4: Deep Explore and Write

After plan approval, flesh out each agreed index and subindex.

### Instructions

1. **Create missing files**: Write new main-index and subindex files **directly** using the fixed preamble Project Index document syntax.
   - Existing useful content: do not blindly overwrite
2. **Determine indexing strategy**
   - Small/medium codebase (under ~150 files) **or** no subindexes → Explore project and write everything yourself (no subagents)
   - Large codebase **and** subindexes → spawn one general subagent per subindex using the **Subagent prompt** below; after all subindexes are written, read subindex results and fill main \`index/index.md\`
3. Proceed to fill the index using the strategy determined above. **Write** using the writing rules below and the fixed preamble Project Index shapes.

### Writing rules

- **Must** match preamble main-index / subindex required shapes and entry syntax
- Link each subindex from the main tree
- For every file: Fill YAML frontmatter with \`description\` and \`read_if\`
- For existing entries: Preserve accurate existing bullets; rewrite stale; add missing; remove dead paths
- If index is shared: do not reference private-only corpora
- If index in both partitions: do not record the same codebase paths in both partitions, keep mostly mutually exclusive
- Filled indexes need only real content; do not keep empty placeholders

### Indexing rules

- Read only what is needed for short, accurate descriptions
- Describe generic files with \`Ditto\`
- Omit build/cache/packages directories; document .gitignored entries only when relevant
- List and index similar files together together in groups for efficiency
- Use directory-only lines for large/low-value trees; keep index information rich and dense

### Subagent prompt

When spawning a subagent to fill subindexes:

- Create the subindex file first if missing, using the fixed preamble subindex shape (or let the subagent create it)
- Spawn a subagent and pass **this prompt**, filling in braces
- Prefer to spawn multiple subagents at once
- Paste the fixed preamble subindex required shape and rules into the prompt (subagents may not have the full preamble)

\`\`\`text
You are responsible for filling one Operator Project Index subindex. Do not edit any other index file, operator.md, catalog.md, or brain content.

## Assignment

- Subindex file: {path to subindex.md}
- Partition: {Private|Shared}
- Coverage: {list of directories/packages}

## Instructions

- Create or read the assigned subindex file
- Explore the project's coverage area and fill: frontmatter, Architecture, and the tree listing
- You may lightly explore other related packages or modules only if necessary; keep main focus on assigned directories
- **You must follow the Project Index subindex document syntax from the fixed Operator preamble** (frontmatter, title, Coverage, Architecture, tree, entry patterns). Filled files need only real content. Do not invent layouts.

## Rules

### Writing rules

- For every file: Fill YAML frontmatter with \`description\` and \`read_if\`
- For existing entries: Preserve accurate existing bullets; rewrite stale; add missing; remove dead paths
- If index is shared: do not reference private-only corpora

### Indexing rules

- Read only what is needed for short, accurate descriptions
- Describe generic files with \`Ditto\`
- Omit build/cache/node_modules directories; document .gitignored entries only when relevant
- List and index similar files together together in groups for efficiency
- Use directory-only lines for large/low-value trees; keep index information rich and dense

## Done When

- Subindex file is written and self-contained for its Coverage
- Reply concisely with: paths covered, files/dirs summarized at coarse grain only, and any gaps

---

{Put specific guidance or user requests here}
\`\`\`

Main agent after subagents return:

- Read each written subindex
- Write/update main \`index/index.md\` (architecture + navigation + links) using preamble main-index syntax
- Fix obvious coverage overlaps between subindexes if found

## Phase 5: Verify

- Run \`operator-helper index lint\` and fix reported issues
- Re-read written files for broken subindex links, empty required sections, or wrong partition

## Phase 6: Confirm

Give the user a concise summary:

- Partitions and files written
- Subindexes added, removed, or kept
- Dual split (if any)
- Intentional depth limits or coverage gaps
- Lint result

Ask whether anything is incorrect, missing, or improperly private/shared. Do not use the \`question\` tool for this free-response confirmation.

Apply approved corrections and finish only after the user confirms.
`;
