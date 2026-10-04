# Operator VS Other Plugins

Other memory plugins treat forgetting as the problem and replay as the cure: capture fragments and retrieve them via RAG, or compress one giant session along forever. Neither approach documents anything.

[Agents Don't Need Memory. They Need Documentation.](https://liao.gg/blog/agents-dont-need-memory)

### It's All the Same Machine

Every memory plugin on the market works the same way:

1. Go through session transcripts
2. Generate snippets of "memories"
3. Insert into a RAG database
4. On every prompt, retrieve the top few and inject
5. Need more? Give the agent a tool to search the database

Some add extras: multi-tier memory classifying short-term and long-term, background agents that review, merge, or deduplicate, "dreamers" that rewrite the store overnight, continuous compression, rerankers. All of it is scaffolding onto the same broken foundation.

### Why Replay Fails

A system stores thousands of memories and shows the model five per prompt. Everything outside that slice effectively does not exist.

- **Memories are surfaced by similarity.** Similarity search ranks how close two snippets are in embedding space. That's it. An obsolete decision and its replacement rank side by side; the model gets both and guesses. Nothing in the system knows which is current.
- **Memories are stored without context.** A snippet can only contain so much. Extraction drops motivations, lessons, constraints, and rationale before any search runs; retrieval can never recover what was never stored.
- **The past is treated as truth.** Replayed memories reflect the moment of capture. The codebase changes every day; the store does not. Nothing supersedes anything.
- **Agents can't search for what they don't know.** A search tool requires the agent to recognize missing context and phrase a query that surfaces it. The agent doesn't know what it doesn't know.
- **The store is unauditable.** Thousands of embeddings sit in a database. You cannot see which memories exist, which are stale, which have never been retrieved, and which have been secretly affecting the way your agent works.

Each additional "innovation" piles its own failure on top:

- Snippet capture — lossy on arrival, stale ever after; contradictions accumulate as competing records instead of one maintained truth.
- Memory CRUD tools — the agent administers a database while a document would have expressed the same knowledge better; the tool surface grows and the actual work waits.
- Compression — a historian model rewrites old conversation while under context pressure while persisting zero inspectable project truth.
- Background maintenance — dreamers, curators, and verifiers burn quota around the clock curating records you cannot open, review, or trust.

Every plugin on the market makes the same assumption:

> Agents forget: that's the problem. So the fix is to remember. To remember better, we should capture more, index better, retrieve smarter.

No one rewatches a team meeting from three years ago to remember why a decision was made. People write things down.

### Operator Takes the Opposite Approach

`AGENTS.md` files were the right instinct: agents need context before they touch a codebase. But a single file is not enough. The agent needs an entire brain — instructions, specs, decisions, research, indexes — and a place in the workflow to write into it.

Operator gives the agent one: a workspace of Markdown documents the agent owns and maintains itself. As the agent works, it documents — specs, decisions, standards, research, lessons — while the full picture is still in context. Afterward it updates what changed. The loop changes from prompt → build → forget to prompt → consult → build → update.

Memory stops being a database you bolt onto the agent and becomes a workspace you can read, edit, commit, and share. Loading is deterministic, failures are visible, and knowledge lives in Git next to the code it describes. What the agent knows is a file you can open. Not 13 rows in a RAG database.

No vector databases. No embeddings. No summarizers, curators, or dreamers. No black-box retrieval.

RAG agents recall. Operator understands.
