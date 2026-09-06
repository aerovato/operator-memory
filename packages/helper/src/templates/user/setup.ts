import { CATALOG_TEMPLATE } from "@aerovato/operator-core/templates/catalog";

import { USER_OPERATOR_TEMPLATE } from "./operator.ts";

export const USER_SETUP_TEMPLATE = `# User Setup

You are helping the user configure their Operator User Partition, the global memory that defines how Operator agents should work with them across all projects.

The User Partition lives at \`~/.operator/user/\`:

- \`operator.md\` — User Instructions; standing doctrine, always injected
- \`catalog.md\` — User Partition Catalog; map of all other files, injected when present
- any other paths — User Partition freeform; long-term memory such as reusable instruction sets, style guides, playbooks, and captured lessons, read only when their catalog Read If matches

The canonical seeds are in the Canonical Seeds section below. Use those bodies when creating or restoring the core files.

Do not place project-specific instructions or facts in this partition. Do not modify the User Partition without the user's approval.

## Phase 1: Read and Assess

Read both core files and the embedded seeds, then assess whether each of \`operator.md\` and \`catalog.md\` is:

- A bare template
- Empty or corrupted
- Partially configured
- Fully configured

Also list every other path in \`~/.operator/user/\` (User Partition freeform).

Use your own judgment by comparing the files.

## Phase 2: Repair

Skip this phase unless a core file is empty, corrupted, or otherwise unusable.

Explain the problem and ask the user naturally whether they want to restore the file from its embedded seed. Do not use the \`question\` tool for this free-response confirmation.

If the user approves, replace the file with its embedded seed, read the restored file, and continue to customization. Never replace a file without explicit approval.

## Phase 3: Customize User Instructions

Skip the full setup interview when \`operator.md\` is fully configured. The user may still request targeted changes during confirmation. Note that the user may explicitly prefer to keep their User Instructions file minimal; if so, that counts as fully configured.

If the file is a bare template or partially configured, use the harness's \`question\` tool to ask the user to select a setup mode:

- Express — Ask a few high-impact questions. Establish essential communication, autonomy, workflow, engineering, and verification preferences with minimal effort. In this mode, avoid asking too many questions.
- Standard — Cover each relevant section with a reasonable number of focused questions. Establish well-rounded instructions without an exhaustive interview.
- Deep — Customize every relevant area. Ask detailed questions, follow up on tradeoffs and exceptions, and resolve conflicts or ambiguity thoroughly.

Next: Ask whether the user has existing cross-project doctrine to incorporate, such as global \`AGENTS.md\` files or instructions from other agent harnesses. If yes: Have the user supply the relevant instructions or file paths and import the doctrine into \`operator.md\`. Do not import project-specific rules. Skills, style guides, and workflow documents are User Partition freeform, not instructions; they are handled in Phase 4.

Next: If you are currently within a full-fledged project, ask the user if they would like you to analyze the project to capture observations about your working style. Do not over-extrapolate based on a single example. Confirm your observations with the user; let them modify or correct mistakes. Do not write yet.

Next: Use the selected setup mode and the \`question\` tool to fill the rest of the gaps in the template. Use multiple selection where appropriate.

Guidelines:
- Group questions together and ask multiple at once to reduce response overhead. Limit to 8 questions at once. Present as many reasonable choices as possible, but limit to 6. If users are unsatisfied with choices, they may always attach their own.
- When free response is required, ask naturally instead and let the user answer in their own words instead of via the \`question\` tool. Prefer to group and ask a maximum of 5 free response questions together at a time.
- Include a clear \`Skip\` or \`Leave unfilled\` choice where appropriate. When the user skips a question, leave that topic unfilled; do not infer an answer or add a default.
- Ask only questions whose answers would materially change the resulting instructions and for which reasonable users may prefer different outcomes.
  - Do not manufacture false choices or ask the user to endorse universal quality expectations.
  - For example, do not ask whether code should be good, maintainable, extensible, strictly typed, or whether edits should be focused; these are obvious standards.

When all information is collected, proceed to write the User Instructions file all at once and move onto Phase 4.

## Phase 4: Catalog

Maintain the User Partition Catalog at \`~/.operator/user/catalog.md\`.

First: List every path in \`~/.operator/user/\` except \`operator.md\` and \`catalog.md\`. Verify every listed path has a catalog entry with a Description and Read If; add entries for any paths that lack them. For artifact-backed freeform, catalog the entry file path (for example \`powerpoint-builder/SKILL.md\`) as a single entry; do not catalog the folder as a separate item and do not catalog individual artifacts.

Next: Offer to port the user's existing skills. Make it explicit that Operator Memory user freeform is a direct, idiomatic replacement for what is commonly known as "Agent Skills" and recommend porting skills over instead of leaving them in harness-specific skill systems. To find candidates, look inside common skill directories such as \`.claude/skills/\`, \`~/.claude/skills/\`, \`~/.agents/skills/\`, and \`.opencode/skills/\`, and ask the user about any other skill locations they know but you do not.

This is global setup: the User Partition applies across all projects. Port only skills the user explicitly wants available globally; do not bulk-port local project skills. Project-specific skills belong in the corresponding Project Brain, not here.

With the user's approval, copy each selected skill into \`~/.operator/user/\`:

- A standalone Markdown skill is copied as a file.
- An artifact-backed skill (folder containing an entry document plus code, images, or other artifacts) is copied as the entire folder. The brain is not limited to Markdown; these folders are perfectly acceptable.

Then catalog each ported skill as above: the entry file only. Do not invent files that do not exist.

## Phase 5: Confirm

Give the user a concise summary of the current contents of \`~/.operator/user/operator.md\`, \`~/.operator/user/catalog.md\`, and any newly cataloged paths.

Ask naturally whether anything is incorrect, missing, too strict, or too permissive. Do not use the \`question\` tool for this free-response confirmation.

After user responds: Apply requested corrections with the user's approval. Finish only after the user confirms and is satisfied.

## Canonical Seeds

When creating or restoring the core files, write these bodies to \`~/.operator/user/\`.

\`operator.md\`:

\`\`\`markdown
${USER_OPERATOR_TEMPLATE.trimEnd()}
\`\`\`

\`catalog.md\` (User variant of the unified partition catalog heading):

\`\`\`markdown
${CATALOG_TEMPLATE.trimEnd()}
\`\`\`
`;
