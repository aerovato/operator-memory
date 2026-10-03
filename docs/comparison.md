# Operator VS Other Plugins

Other memory plugins treat forgetting as the problem. They think the solution is to replay past context to agents: capture fragments and retrieve them via RAG, or compress one giant session along forever. Neither approach documents anything.

### The Core Failure

Every replay-based system stores thousands of memories and shows the model five or ten. Everything outside that slice effectively does not exist.

- Similarity and recency do not establish correctness, currency, or authority.
- An obsolete decision ranks as highly as the current one.
- A critical constraint phrased in unfamiliar vocabulary never enters the result set.
- The store is a black box: you cannot see what was remembered, what was forgotten, or why.
- Failures surface later as bad answers.

### Why Each Approach Fails

#### Snippet capture

Fragments are recorded without context. Extraction drops evidence before any search runs, so retrieval can never recover it. Lossy on arrival, and stale ever after. Contradictions accumulate as competing records instead of one maintained truth.

#### RAG retrieval

The model sees a top-k slice of the corpus. Top-k injection is a hard content boundary, and raising it floods context with stale fragments. Search tools do not fix this: the agent must already know what it is missing to look for it.

#### Memory CRUD tools

The agent administers a database: remember, update, merge, forget. Knowledge gets atomized into records that need specialized operations to maintain, while a document would have expressed the same thing better. The tool surface grows, context shrinks, and the actual work waits.

#### Compression

A historian model rewrites old conversation into summaries so the context window stays alive. The model decides what disappears while already under context pressure. What was never preserved cannot be recovered. Zero project truth is persisted.

#### Background maintenance

Dreamers, curators, deduplicators, and verifiers run around the clock, each pass another model guessing at what mattered. Quota is burned to curate garbage: records you cannot open, review, or trust.

### Operator Takes the Opposite Approach

Operator gives the agent a brain: a workspace of Markdown documents the agent owns and maintains itself. There is no capture step and no background pipeline. As the agent works, it documents — specs, decisions, standards, research, lessons.

Operator's memory is transparent. Every document is plain Markdown you can open, edit, and share. Loading is deterministic, failures are visible, and knowledge lives in Git next to the code it describes. What the agent knows is a file you can open. Not 13 rows in a RAG database.

RAG agents recall. Operator understands.
