export const PROJECT_INDEX_TEMPLATE = `---
description: …
read_if: …
---

# {Private|Shared} Project Index

## Architecture

- Essential architectural facts about the project
- Cross-file organization worth knowing before deep reads
- Keep short

## Project Index

- \`package.json\` — Ditto
- \`README.md\` — Ditto
- \`irrelevant/\` — Irrelevant directory; do not list files

### \`src/\` — Concise description of contents

- \`index.ts\` — Concise description of contents
- \`file.ts\` — …
- \`large-directory/\` — Large directory; do not list files

#### \`src/tools\` — …

- \`base.ts\` — …
- \`tool-1.ts\`, \`tool-2.ts\`, \`tool-3.ts\` — Similar files grouped

### \`tests/\` — …

- \`module.test.ts\` — …
`;
