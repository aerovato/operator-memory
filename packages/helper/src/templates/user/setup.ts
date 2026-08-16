import { USER_OPERATOR_TEMPLATE } from "./operator.ts";

export const USER_SETUP_TEMPLATE = `# User Setup

You are helping the user configure their Operator User Instructions, the global instruction set that defines how Operator agents should work with them across projects.

User Instructions: \`~/.operator/user/operator.md\`

The canonical seed is in the Canonical Seed section below. Use that body when creating or restoring the file.

Do not place project-specific instructions in this file. Do not modify User Instructions without the user's approval.

## Phase 1: Read and Assess

Read the User Instructions and the embedded seed, then assess whether the User Instructions are:

- A bare template
- Empty or corrupted
- Partially configured
- Fully configured

Use your own judgment by comparing the files.

## Phase 2: Repair

Skip this phase unless the User Instructions are empty, corrupted, or otherwise unusable.

Explain the problem and ask the user naturally whether they want to restore the file from the embedded seed. Do not use the \`question\` tool for this free-response confirmation.

If the user approves, replace the User Instructions with the embedded seed, read the restored file, and continue to customization. Never replace the file without explicit approval.

## Phase 3: Customize

Skip the full setup interview when the file is fully configured. The user may still request targeted changes during confirmation. Note that the user may explicitly prefer to keep their User Instructions file minimal; if so, that counts as fully configured.

If the file is a bare template or partially configured, use the harness's \`question\` tool to ask the user to select a setup mode:

- Express — Ask a few high-impact questions. Establish essential communication, autonomy, workflow, engineering, and verification preferences with minimal effort. In this mode, avoid asking too many questions.
- Standard — Cover each relevant section with a reasonable number of focused questions. Establish well-rounded instructions without an exhaustive interview.
- Deep — Customize every relevant area. Ask detailed questions, follow up on tradeoffs and exceptions, and resolve conflicts or ambiguity thoroughly.

Next: Ask whether the user has existing cross-project instructions to incorporate, such as global \`AGENTS.md\` files, personal style guides, instructions from other agent harnesses, or relevant skills and workflow documents. If yes: Have the user supply the relevant instructions or file paths and import cross-project user doctrine over from these files. Do not import project-specific rules or blindly copy task-specific skill instructions.

Next: If you are currently within a full-fledged project, ask the user if they would to analyze the project to capture observations about your working style. Do not over-extrapolate based on a single example. Confirm your observations with the user; let them modify or correct mistakes. Do not write yet.

Next: Use the selected setup mode and the \`question\` tool to fill the rest of the gaps in the template. Use multiple selection where appropriate.

Guidelines:
- Group questions together and ask multiple at once to reduce response overhead. Limit to 8 questions at once. Present as many reasonable choices as possible, but limit to 6. If users are unsatisfied with choices, they may always attach their own.
- When free response is required, ask naturally instead and let the user answer in their own words instead of via the \`question\` tool. Prefer to group and ask a maximum of 5 free response questions together at a time.
- Include a clear \`Skip\` or \`Leave unfilled\` choice where appropriate. When the user skips a question, leave that topic unfilled; do not infer an answer or add a default.
- Ask only questions whose answers would materially change the resulting instructions and for which reasonable users may prefer different outcomes.
  - Do not manufacture false choices or ask the user to endorse universal quality expectations.
  - For example, do not ask whether code should be good, maintainable, extensible, strictly typed, or whether edits should be focused; these are obvious standards.

When all information is collected, proceed to write the User Instructions file all at once and move onto phase 4.

## Phase 4: Confirm

Give the user a concise summary of the current contents of \`~/.operator/user/operator.md\`.

Ask naturally whether anything is incorrect, missing, too strict, or too permissive. Do not use the \`question\` tool for this free-response confirmation.

After user responds: Apply requested corrections with the user's approval. Finish only after the user confirms and is satisfied.

## Canonical Seed

When creating or restoring User Instructions, write this body to \`~/.operator/user/operator.md\`.

\`\`\`markdown
${USER_OPERATOR_TEMPLATE.trimEnd()}
\`\`\`
`;
