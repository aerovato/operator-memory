# Operator Architecture

Operator Memory is durable context for agent-driven development. Agents document project knowledge as Markdown over the course of ordinary work. Operator loads a small, deterministic orientation at the start of each session and leaves structured routes into deeper material.

## The Brain

The Brain is the human-readable knowledge space on disk. It may include instructions, specifications, plans, research, architecture and decisions, standards and lessons, catalogs of Brain content, and Project Indexes of codebase structure.

Memory is not a separate database. It is the durable knowledge that continuous documentation produces.

## Partitions

Knowledge is separated by ownership and publication intent.

### Project Private

`.operator/` is local project knowledge. Helper records that path in the global Git ignore. When instructions conflict, private project guidance takes precedence over user-global and shared project guidance.

### Project Shared

`.operator-shared/` is project knowledge intentionally published with the repository. Shared is optional and is created only when activated. It is the natural home for repository-wide instructions and the main Project Index when a team shares Operator context through Git.

### User

`~/.operator/user/` holds private, project-agnostic instructions that apply across projects.

## Brain Components

### Operator Instructions

Each `operator.md` carries standing rules for how agents should work in that scope. Project-specific doctrine belongs in a project partition; cross-project preferences belong in User.

### Partition Catalogs

Each `catalog.md` maps the freeform documents in one partition: what a document covers and when it is worth opening. Catalog bodies appear in the session preamble so the agent receives a compact map without loading every file up front.

### Project Indexes

`index/` maps codebase structure and intent. Every index document carries a short description and a `read_if` condition. The main `index/index.md` body enters the preamble; subindexes are listed there and opened when their condition matches the task.

Project Indexes map code. Catalogs map Brain knowledge. The split exists because source navigation and durable project understanding are different concerns.

### Freeform Documents

Everything else in a partition—specifications, plans, research, decisions, guides, lessons—is freeform Brain content. Those files are read deliberately through catalog guidance, not pulled in by automatic similarity search.

## Why Operator Does Not Use RAG

RAG turns memory into fragments ranked against a query. The model receives a bounded top-k slice; unselected knowledge simply does not appear. Similarity does not establish current authority, importance, approval, or completeness.

Operator relies on coherent documents and explicit maps instead:

- Stable orientation loads deterministically.
- Catalogs route through durable knowledge.
- Project Indexes route through code.
- Humans and agents update current knowledge at its source.
- No embedding model, vector database, reranker, or automatic semantic injection is required.

The Brain can still go stale (e.g. after git pull). Operator keeps that failure in ordinary files—inspectable and correctable—rather than inside probabilistic retrieval and background mutation.
