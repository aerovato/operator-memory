# Preamble

Last Updated: November 24, 2026

The preamble gives the agent fixed Operator guidance and available durable Memory. Prefer a synthetic model-call contribution rendered once and held immutable for the session so its prefix remains cacheable. Persisted lifecycle injection and re-rendering are also fully acceptable, even when a non-persisted route exists; choose what fits the harness. A load failure produces the diagnostic instead of partial memory. Do not refresh on every turn merely to track Brain edits. See [`reference/implementation.md`](./reference/implementation.md) for adapter pathways.

Preferred preamble immutability is a bootstrap and cache contract, not a live-memory limitation. The working agent continuously documents the Brain and retains awareness of its own changes through the conversation. Ordinary agent-authored changes to instructions, catalogs, indexes, or freeform documents do not require a new session. Future sessions load the maintained snapshot from disk.

How a harness injects and caches the preamble is adapter-specific; see [`reference/implementation.md`](./reference/implementation.md).

## Composition

### Versioned Rollout

Fixed guidance and tenets are a paired version; their opening XML tags carry matching `version` attributes. Memory, diagnostics, and warnings remain shared, except the missing-index warning's condition, which is part of the tested wording.

An A/B test is active: v2.1 is assigned to 20 percent of machines and v2.0 to the rest. v2.0 is the control; the candidate lives in `prompts/preamble-v2-1.ts`. v2.1 differs only in index wording: the Project Index is described as a map of project content of any file type instead of a codebase, and the missing-index warning triggers on substantive project content instead of project code. The index template is shared by both versions and includes an `assets/` entry showing that non-text files are indexable.

Core retains `selectPreambleVersion`, `isRolloutAssigned`, and `readMachineIdentity` as permanent infrastructure. `PreambleVersion` is `"2.0" | "2.1"`. Selection reads the machine identity on each render: a machine in the assigned 20 percent receives v2.1; any machine without a readable identity receives v2.0. Selection applies when rendering, without replacing already-injected session content.

The `OPERATOR_PREAMBLE_BETA` environment variable is permanent infrastructure alongside the rollout split and is never retired, even when no test is active. When its value is exactly `1`, selection returns the candidate version without reading machine identity; any other value leaves the split in effect. Each new candidate version replaces the previous one behind the flag.

`isRolloutAssigned(identity, percentage)` hashes the identity with SHA-256, interprets the first four digest bytes as an unsigned big-endian integer, takes modulo 100, and returns true below `percentage` (0–100). The same identity and percentage always give the same result; keep the hash input unchanged for the duration of an active rollout.

`readMachineIdentity` reads Linux `/etc/machine-id`, macOS `IOPlatformUUID`, or Windows `HKLM\SOFTWARE\Microsoft\Cryptography` `MachineGuid` in the 64-bit registry view and returns it trimmed and lowercase. OS reinstallations or cloned identities can change or duplicate assignment.

Missing, invalid, unreadable, or unsupported machine identity yields no bucket. Machine identity is never persisted, transmitted, or injected into model context. Selection does not write to the filesystem.

### Sections

The preamble contains:

1. Static Operator guidance
2. Conditional Operator Instructions
3. Conditional catalog bodies — User Catalog (`<user-catalog>`) then Project Partition Catalogs (`<partition-catalog>`)
4. Conditional Project Index listings and main bodies
5. Core tenets
6. Dynamic setup or maintenance warnings

Machine-significant sections use XML labels, including `<operator-guidance>`, `<operator-instructions>`, `<user-catalog>`, `<project-index>`, `<partition-catalog>`, `<operator-tenets>`, `<operator-warning>`, and `<file-content path="...">`.

Core tenets are fixed text injected after memory files and before warnings so they sit closer to the first user turn. A load-failure diagnostic replaces memory, tenets, and warnings; the diagnostic stays last.

If any partition fails to load, no partition memory is injected. An `<operator-diagnostic>` lists every partition result and directs recovery before ordinary work: check and update Helper, repair only reported load failures, and validate with `operator-helper memory check`. Preserve existing content and leave absent partitions absent; destructive or ambiguous repairs require user guidance. Report unresolved blockers. On success, ask the user to start a new session and resubmit the original request so the complete preamble loads. Adapters should surface one recovery notice per affected session when the harness allows it.

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
- If a Project Brain exists but neither partition has a main index, tell the agent to offer to build it directly when there is project code and Project Init is not already running.
- If a Project Brain exists but neither catalog exists, tell the agent to create and maintain a catalog for non-empty brain partitions.

Warnings are conditional injection, not part of the fixed prompt.
