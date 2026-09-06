export const CATALOG_TEMPLATE = `# {User|Private|Shared} Partition Catalog

## Tree

- \`operator.md\`
  - Description: Operator Instructions for this partition.
  - Read If: Auto-injected.
- \`catalog.md\`
  - Description: This catalog.
  - Read If: Auto-injected.
- \`powerpoint-builder/SKILL.md\` (artifact-backed freeform example)
  - Description: PowerPoint generation skill; supporting templates and images live in \`powerpoint-builder/\`.
  - Read If: Creating or reviewing presentations.
- \`writing-style.md\` (User Partition freeform example)
  - Description: Cross-project writing style rules so replies do not sound like AI.
  - Read If: Writing any user-facing reply or document.

### \`specs/\` - System contracts for this partition (Project partition freeform example)

- \`example.md\`
  - Description: …
  - Read If: …
`;
