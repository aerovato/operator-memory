# Operator Architecture

Operator Memory is durable context for agent-driven development. Agents document project knowledge as Markdown over the course of ordinary work. Every session starts with a small, deterministic orientation and explicit routes into deeper material. Nothing is ranked, guessed, or retrieved by similarity.

### The Brain

The Brain is the knowledge space on disk: instructions, specifications, plans, research, architecture and decisions, standards and lessons, plus the catalogs and indexes that map it. It is ordinary Markdown, split into three partitions by ownership:

- `~/.operator/user/` — User/global partition. Project-agnostic memory: preferences, standards, and reusable skills.
- `.operator/` — Project private partition. Local project knowledge; Git-ignored by Helper on first setup.
- `.operator-shared/` — Project shared partition. Knowledge published with the repository; created only when activated.

When instructions conflict, the hierarchy is: Private > User > Shared.

Memory is not a separate database. It is the durable knowledge that continuous documentation produces.

### What Loads, And What Doesn't

The preamble is the lightweight entrypoint. At the start of every conversation, Operator loads:

- Operator Guidance — fixed framework rules: the memory-aware workflow, partition placement and authority, catalog and index semantics.
- Operator Instructions — standing rules from each partition's `operator.md`, merged by authority.
- Partition Catalogs — each partition's `catalog.md`, a compact map of its Brain documents.
- The main Project Index — `index/index.md`, the repository's structural map.
- Warnings and diagnostics — malformed or missing context flagged for repair.

Everything else — specifications, plans, research, guides — stays on disk and is read deliberately when the task calls for it. Loading is deterministic: the same session start produces the same orientation, every time.

### The Maps

Two map types route the agent, because source navigation and durable knowledge are different concerns:

- Partition Catalogs map the Brain. Each entry states what a document covers and when to open it. Catalogs map Brain knowledge; indexes map code.
- Project Indexes map the codebase. Every index document carries a description and a `read_if` condition; the main index enters the preamble and subindexes are opened when their condition matches the task.

Freeform documents — everything else in a partition — are read through catalog guidance, never pulled in by automatic selection.

### No RAG

RAG turns memory into fragments ranked against a query. The model receives a bounded top-k slice; everything unselected simply does not appear.

Operator relies on coherent documents and explicit maps instead:

- Stable orientation loads deterministically.
- Catalogs route through durable knowledge.
- Project Indexes route through code.
- Humans and agents update current knowledge at its source.
- No embedding model, vector database, reranker, or automatic semantic injection is required.

For the full argument against replay-based memory, see [Operator VS Other Plugins](comparison.md).

### Failure Is Visible

The Brain can go stale — after significant upstream changes or if the agent simply forgets to update. Operator keeps that failure in ordinary files: inspectable, correctable.
