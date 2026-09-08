<p>
  <img src="docs/assets/banner.jpeg" alt="Operator Memory, the self-improving context engine for coding agents">
</p>

# Operator Memory

### The self-improving context engine for coding agents.

Agents excel in a session but forget everything the moment it ends. Future sessions waste tokens re-gathering an incomplete context: re-exploring the codebase, re-learning the architecture, re-teaching decisions and corrections.

Operator Memory gives the agent a brain for documenting all their work. As the agent works, it automatically documents within this brain — specs, decisions, standards, research, lessons. Every new session starts from those files.

## What You Get

- **A Complete Context Engine** — Operator Memory provides memory, documentation, codebase indexes, and skills within a single integrated system.
- **Automatic Documentation** — Specs, decisions, research, and lessons are automatically documented by the agent during normal work. No capture step. No background tasks.
- **Transparent Memory** — Memory is stored as documents you can read, update, and delete.
- **Sharable Knowledge** — Every document is optionally shareable. Track documents with Git and share knowledge with your team.
- **Zero Infrastructure** — No embeddings, no vector database, no background pipelines, no model configuration.

## How It Works

Operator gives the agent a durable workspace of Markdown, kept in three places:

- `.operator/` — private project knowledge, stays on your machine
- `.operator-shared/` — project knowledge published with the repository
- `~/.operator/user/` — your personal rules and knowledge, used across projects

Every session runs the same loop:

1. **Consult** — the agent starts from your Brain: instructions, codebase index, specs, guides.
2. **Build** — the agent does normal development work, informed by that knowledge.
3. **Update** — the agent records what changed: new specs, decisions, standards, lessons.

When project truth changes, the agent updates the canonical file instead of adding a RAG database record. For more details, see [Architecture](docs/architecture.md).

## Install Operator

Operator is managed via the Operator Helper. Install the Helper with npm:

```sh
npm install --global @aerovato/operator-helper
```

Or Bun:

```sh
bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest
```

Then install the Operator adapter for your harness:

```sh
# OpenCode
operator-helper install opencode

# OpenCode V2 beta
operator-helper install opencode-v2

# Code Puppy
operator-helper install code-puppy
```

## Setup Operator

Setup is a conversation with your agent. Run each command in a new conversation.

1. First time only: `/operator:user-init` — set up your global user partition.
2. In each new project: `/operator:project-init` — scaffold Operator and migrate existing documents.
3. In existing repositories: `/operator:index` — map the repo so later sessions can navigate it.
4. Start a new conversation and do normal work.

When starting cold on an existing project, it's recommended to ask the agent to create their first specs for specific features, modules, or systems that you will work on. Once those documents exist, later sessions will automatically maintain them.

## Everyday Workflow

1. Give the agent normal development work.
2. The agent automatically consults existing knowledge: index for navigating code, specs for module contracts, guides for third-party integration details.
3. The agent automatically updates existing knowledge: When project truth changes, the relevant documents are automatically updated.
4. The next session continues from the updated knowledge.

Sometimes agents hesitate to create, consolidate, or split documents. In that case, steer the agent towards making larger architectural decisions:

- "Write a spec for this feature before implementing it."
- "Record this research so we do not repeat the investigation."
- "These two documents overlap. Consolidate them."
- "This document is too large. Split it."
- "Promote this spec to Shared so the team receives it."

## VS Other Memory Plugins

Other memory plugins treat forgetting as the problem. They think the solution is to replay past context to agents; either by capture fragments and retrieving via RAG, or compress one giant session along forever without documenting anything. Both approaches fall short.

- **Snippets are not knowledge.** Other plugins record snippets as memory — incomplete, lacking context, and stale on arrival.
- **Retrieval is a lottery.** RAG plugins accumulate thousands of chunks and only return a lossy top-k slice. There's no way to know what was lost.
- **Memory fails silently.** The store is a black box: you cannot see what was remembered, what was forgotten, or why — failures surface later as bad answers.
- **Compression is not documentation.** Context compression keeps the context window alive, but persists zero sharable, inspectable project truth.
- **You pay to maintain garbage.** Every background dreamer, curator, and analyst is a token furnace that burns quota, never producing a document you can read or trust.

Operator Memory does not try to recall the past. It writes down the present so the future does not need to guess. What the agent knows is a file you can open. Not 13 rows in a RAG database.

RAG agents recall. Operator understands.

## Roadmap

**Operator Memory is under active development.** More features are on the way, including support for other harnesses.

#### Brain Improvements

- **Observation Engine** — Learn durable user observations over time, kept separate from explicit User Instructions.
- **Reliable Brain Updates** — Keep specs and other Brain documents current during long conversations, instead of relying only on the agent to remember.

#### Context Management

- **Cache-Aware Context Management** — Automatically refresh preamble and apply tool call pruning when cache expires.
- **Lossless Context Compression** — Losslessly extend context via lossless context compression.

#### Additional Harnesses

- **Pi** — Next adapter
- **Claude Code** — Pending research
- **Codex** — Pending research

## Learn More

- [Workflow](docs/workflow.md) - how to direct continuous documentation and maintain a useful Brain. Includes the command reference.
- [Architecture](docs/architecture.md) - how partitions, catalogs, indexes, and deterministic context loading work.
- [Troubleshooting](docs/troubleshooting.md) - installation, validation, repair, and update recovery.
- [Demo](https://github.com/aerovato/operator-demo-terra-js) - a Minecraft-like web app built agent-driven with Operator. The [recorded conversation](https://opncd.ai/share/2F8fjjEp) shows the brain being used and maintained throughout.

## License

BSD 3-Clause. See [`LICENSE`](LICENSE).
