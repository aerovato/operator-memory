<p>
  <img src="docs/assets/banner.jpeg" alt="Operator Memory, the self-improving context engine for coding agents">
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

### Operator Memory: The self-improving context engine for coding agents.

Operator Memory gives your agent a brain for documenting all their work. As the agent works, it automatically documents within this brain — specs, decisions, standards, research, lessons. Every new session starts knowing everything the last one learned.

#### Features

- **Complete Context Engine** — Documentation, memory, indexes, and skills within a single integrated system.
- **Automatic Documentation** — Specs, decisions, research, and more are automatically documented by the agent.
- **Transparent Memory** — Memory is stored as Markdown documents you can read, update, and delete.
- **Sharable Knowledge** — Track documents with Git and share knowledge with your team.
- **Zero Infrastructure** — No background agents, no embeddings, no vector database, no model configuration.

### Installation

Operator is managed via the Operator Helper. Install the Helper with npm:

```sh
npm install --global @aerovato/operator-helper
```

Or Bun:

```sh
bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest
```

Then install the Operator adapter for your harness. Click each link for harness-specific information.

| Harness | Status | Install |
| --- | --- | --- |
| [Claude Code](docs/harnesses/claude-code.md) | 🟢 Fully Supported | `operator-helper install claude-code` |
| [Codex](docs/harnesses/codex.md) | 🟢 Fully Supported | `operator-helper install codex` |
| [OpenCode V2](docs/harnesses/opencode-v2.md) | 🟢 Fully Supported | `operator-helper install opencode-v2` |
| [OpenCode V1](docs/harnesses/opencode.md) | 🟡 Supported, Legacy | `operator-helper install opencode` |
| [Pi](docs/harnesses/pi.md) | 🟢 Fully Supported | `operator-helper install pi` |
| [DeepSeek Harness](docs/harnesses/deepseek.md) | 🟢 Fully Supported | `operator-helper install deepseek` |

Setup is a conversation with your agent. Run each command in a new conversation.

1. First time only: `/operator:user-init` — set up your global user partition.
2. In each new project: `/operator:project-init` — scaffold Operator, migrate existing documents, and index the repo.
3. Start a new conversation and do normal work.

When starting cold on an existing project, it's recommended to ask the agent to create their first specs for specific features, modules, or systems that you will work on. Once those documents exist, later sessions will automatically maintain them.

### How Operator Works

Agents excel in a single session but forget everything the moment it ends. Future sessions waste tokens re-gathering an incomplete context: re-exploring the codebase, re-learning the architecture, re-teaching decisions and corrections.

Operator gives the agent a durable workspace of Markdown, kept in three places:

- `.operator/` — private project knowledge, stays on your machine
- `.operator-shared/` — project knowledge published with the repository
- `~/.operator/user/` — your personal rules and knowledge, used across projects

Every session runs the same loop:

1. **Consult** — the agent starts from your Brain: instructions, codebase index, specs, guides.
2. **Build** — the agent does normal development work, informed by that knowledge.
3. **Update** — the agent records what changed: new specs, decisions, standards, lessons.

When project truth changes, the agent updates the canonical file instead of adding a RAG database record. For more details, see [Architecture](docs/architecture.md).

<p>
  <img src="docs/assets/change-the-loop.png" alt="The memory-aware agentic loop: consult the brain, build, update the brain">
</p>

### Everyday Workflow

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

### Roadmap

**Operator Memory is under active development.** More features are on the way.

#### Brain Improvements

- **Observation Engine** — Learn durable user observations over time, kept separate from explicit User Instructions.
- **Reliable Brain Updates** — Keep specs and other Brain documents current during long conversations, instead of relying only on the agent to remember.

#### Context Management

- **Cache-Aware Context Management** — Automatically refresh preamble and apply tool call pruning when cache expires.
- **Lossless Context Compression** — Losslessly extend context via lossless context compression.

### VS Other Memory Plugins

Snippet capture, RAG retrieval, and context compression all fail the same way: [read the comparison](docs/comparison.md).

### Learn More

- [Workflow](docs/workflow.md) - how to direct continuous documentation and maintain a useful Brain. Includes the command reference.
- [Architecture](docs/architecture.md) - how partitions, catalogs, indexes, and deterministic context loading work.
- [Harness docs](docs/harnesses/) - per-harness installation, verification, commands, updates, and troubleshooting.
- [Troubleshooting](docs/troubleshooting.md) - validation, repair, and update recovery.

### License

BSD 3-Clause. See [`LICENSE`](LICENSE).
