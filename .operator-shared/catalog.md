# Shared Partition Catalog

## Guidelines

- Index all brain files and directories worth knowing.
- Catalog **only** this partition’s brain root — not the codebase.
- If a directory is large or low-value, only catalog the directory; do not list every file.
- DO NOT index the `index/` directory; it is automatically indexed.
- Every entry must have a **Description** and **Read If**.
- **Maintain when brain files or layout change.**

## Tree

Repository-wide Operator product knowledge published with the project.

- `README.md`
  - Description: Contributor-facing introduction to Operator Memory.
  - Read If: Do not read during normal agent work; written for newcomers without Operator installed.
- `operator.md`
  - Description: Repository tooling, engineering, documentation, and publication rules.
  - Read If: Auto-injected.
- `catalog.md`
  - Description: This catalog.
  - Read If: Auto-injected.
- `overview.md`
  - Description: Operator Memory product summary, MVP target, and package boundaries.
  - Read If: Explaining the product, MVP scope, or package boundaries.

### `guides/`

- `effect.md`
  - Description: Effect v4 and effect-smol source, implementation, and testing guidance.
  - Read If: Working with Effect v4 or effect-smol TypeScript code.

### `references/`

- `effect-smol/`
  - Description: Locally installed, Git-ignored Effect v4 reference source tree used by the Effect guide.
  - Read If: Verifying Effect APIs, examples, tests, or source conventions.
