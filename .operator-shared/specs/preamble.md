# Preamble

Last Updated: October 1, 2026

The preamble gives the agent fixed Operator guidance and available durable Memory. Prefer a synthetic model-call contribution rendered once and held immutable for the session so its prefix remains cacheable. Persisted lifecycle injection and re-rendering are also fully acceptable, even when a non-persisted route exists; choose what fits the harness. A load failure produces the diagnostic instead of partial memory. Do not refresh on every turn merely to track Brain edits. See [`reference/implementation.md`](./reference/implementation.md) for adapter pathways.

Preferred preamble immutability is a bootstrap and cache contract, not a live-memory limitation. The working agent continuously documents the Brain and retains awareness of its own changes through the conversation. Ordinary agent-authored changes to instructions, catalogs, indexes, or freeform documents do not require a new session. Future sessions load the maintained snapshot from disk.

How a harness injects and caches the preamble is adapter-specific; see [`reference/implementation.md`](./reference/implementation.md).

## Composition

The preamble contains:

1. Static Operator guidance
2. Conditional Operator Instructions
3. Conditional catalog bodies — User Catalog (`<user-catalog>`) then Project Partition Catalogs (`<partition-catalog>`)
4. Conditional Project Index listings and main bodies
5. Core tenets
6. Dynamic setup or maintenance warnings

Machine-significant sections use XML labels, including `<operator-guidance>`, `<operator-instructions>`, `<user-catalog>`, `<project-index>`, `<partition-catalog>`, `<operator-tenets>`, `<operator-warning>`, and `<file-content path="...">`.

Core tenets are fixed text injected after memory files and before warnings so they sit closer to the first user turn. A load-failure diagnostic replaces memory, tenets, and warnings; the diagnostic stays last.

If any partition fails to load, no partition memory is injected. An `<operator-diagnostic>` lists every partition result and requires the agent to fix loading before continuing and validate with `operator-helper memory check`. On a successful check the agent tells the user to start a new session and resubmit their original request so the next session loads the full preamble; on unresolved failure the agent stops and directs the user to run `/operator:repair` in a standalone session. The human-facing `/operator:repair` command starts the same workflow from the harness in a standalone session. Adapters should surface one recovery notice per affected session when the harness allows it.

Fixed guidance embeds main-index, subindex, and catalog bodies from `@aerovato/operator-core` templates via interpolation inside the Project Index and Partition Catalog sections. Those template exports are the single source of truth for document syntax; helper init reuses them. Agents follow those shapes when creating or restructuring indexes and catalogs. Filled documents need only real content; seed instructional text is not preserved.

## Instructions

Inject each present instruction body from least to most authoritative:

1. `.operator-shared/operator.md`
2. `~/.operator/user/operator.md`
3. `.operator/operator.md`

Project Private therefore wins conflicts over User, which wins over Project Shared.

## User Catalog

Inject the full `~/.operator/user/catalog.md` body in its own `<user-catalog>` section, after instructions and before the Project Partition Catalogs and Project Index. Inject it even when no Project Brain exists; it never nests inside `<partition-catalog>`.

## Project Index

For Shared then Private:

- Inject a recursively sorted relative-path listing for all Markdown index files.
- Show each valid `description` and `read_if` value.
- For invalid frontmatter, retain the path and instruct the agent to repair both fields.
- Inject the full `index/index.md` body when present.
- Do not inject subindex bodies automatically.

## Catalogs

Inject full catalog bodies when present in Shared then Private order. Catalogs are smart listings of brain content; they are distinct from Project Indexes.

## Warnings

- If the `~/.operator/user` directory does not exist, tell the agent to ask for `/operator:user-init` when the user would benefit from cross-project user memory, but not when working without user memory intentionally.
- If the User Partition exists but `catalog.md` is missing, tell the agent to create and maintain a User Catalog. This warning is independent of project-catalog warnings.
- If neither project partition root exists, tell the agent to ask for `/operator:project-init` before significant project work, but not when the user is merely exploring.
- If a Project Brain exists but no index files are discovered, tell the agent to ask for `/operator:index` before project work when the project is not empty.
- If a Project Brain exists but neither catalog exists, tell the agent to create and maintain a catalog for non-empty brain partitions.

Warnings are conditional injection, not part of the fixed prompt.
