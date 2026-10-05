---
description: DeepSeek Harness agent loop, prompt assembly, model requests, session history, and context source map
read_if: Designing DeepSeek Harness preamble injection, session scoping, failure behavior, context persistence, or subagent inheritance
---

# DeepSeek Harness Runtime

## Coverage

- `reference/deepseek-harness/packages/core/`, `packages/context/`, `packages/llm/`, `packages/session/`, `packages/compaction/`
- Focused runtime references under `reference/deepseek-harness/docs/subsystems/`

## Architecture

- `core/agent` declares the service and agent lifecycle; `core/agent-loop` is one replaceable driver. Extensions consume the agent service, not the concrete loop.
- Prompt assembly combines ordered sections, dynamic contexts, variables, and tool schemas per step. Agent-loop commits model-visible content as session events; requests derive immutable history from the session surface. A prompt contribution is not an out-of-band model transform.
- Session history, fork/resume, persistence, and compaction are separate layers. Subagent lifecycle and provider implementations are indexed in [DeepSeek Harness Plugins](plugins.md).

## `reference/deepseek-harness/packages/core/` Index

- `README.md` — Group ownership and package navigation.

### `agent/` — Agent creation, scoped setup, inbox, and lifecycle interface

- `src/index.ts`, `src/types.ts`, `src/runtime-types.ts` — Public service/event registration and agent types.
- `src/dispatch.ts`, `src/consumed-work.ts`, `src/archive-admission.ts` — Lifecycle dispatch and admission.
- `src/model-selection.ts`, `src/projection.ts`, `src/invariant.ts` — Model selection, derived state, and invariants.
- `README.md` — Agent service reference.

### `agent-loop/` — Concrete request and tool-driving loop

- `src/agent.ts`, `src/index.ts` — Agent implementation and loop entry points.
- `src/inbox.ts`, `src/runtime-context.ts` — Claimed input and prompt-context snapshots.
- `src/assistant-stream.ts`, `src/tool-calls.ts` — Model output settlement and tool dispatch.
- `src/constants.ts`, `src/invariant.ts` — Constants and history/request checks.
- `README.md` — Step admission, request retries, and system-message placement.

### `system-prompt/` — Scoped prompt registry and rendering

- `src/index.ts`, `src/invariant.ts` — Sections, contexts, variables, tool schemas, assembly waterfall, and validation.
- `README.md` — Prompt placement and authoring reference.

### Other core packages

- `session/src/` — Event-sourced Session, surface projection, fork, and request-header tracking; large package.
- `scope/src/` — Agent-scoped service registrations and event filtering.
- `tools/src/` — Typed tool definitions, registration, execution, schemas, and presentation; large package.
- `agent-default-model/`, `agent-tool-presentation/` — Default model selection and tool presentation.

## `reference/deepseek-harness/packages/context/` Index

- `README.md` — Context contributor map.
- `agent-instructions/src/index.ts`, `agent-instructions/src/files.ts`, `agent-instructions/src/state.ts` — Instruction-file contributor, discovery, and session-facing state.
- `agent-instructions/src/config.ts`, `agent-instructions/src/render.ts`, `agent-instructions/src/digest.ts` — Configuration, rendering, and content identity.
- `file-reference/`, `file-reference-local/` — File reference grammar and local resolution.
- `session-reference/` — Session citation and reference projection.
- `time-context/`, `tmux-context/` — Runtime time and terminal context.

## `reference/deepseek-harness/packages/llm/` Index

- `llm/src/` — Model request/response types, adapter registration, streaming, and call preparation; large package.
- `llm-deepseek/`, `llm-deepseek-account/`, `llm-deepseek-api-key/`, `llm-pi-ai/` — Provider implementations and credentials; large provider trees.
- `llm-retry/` — Retry history and strategy.
- `token-meter/` — Token estimation and request usage projection.
- `deepseek-llm-api-extensions/`, `plugin-package-inventory-deepseek/` — DeepSeek wire extensions and provider metadata.

## `reference/deepseek-harness/packages/session/` Index

- `session-persistence/`, `session-persistence-jsonl/` — Persistence API and JSONL backend; large storage implementation.
- `session-format/`, `session-format-catalog/`, `session-format-v0-to-v1/`, `session-format-v1-to-v2/`, `session-format-v2-to-v3/`, `session-format-v3-to-v4/` — Versioned session encoding and adjacent migrations.
- `session-projection/`, `session-projection-cache/`, `session-checkpoint-policy/` — Replayed derived state and checkpointing.
- `session-log-deepseek/`, `session-stats/`, `session-telemetry/`, `session-telemetry-otel/`, `session-turn-outline/` — Log views, usage, telemetry, and turn projections.
- `session-title/`, `session-title-llm/`, `session-title-first-prompt-llm/`, `session-title-all-prompts-llm/` — Title providers and selection.

## `reference/deepseek-harness/packages/compaction/` Index

- `compaction/`, `compaction-basic/` — Compaction service and summarizing provider.
- `command-compact/` — Interactive compaction command.
- `compaction-image-offload/`, `compaction-tool-result-pruner/` — Image offload and tool-result reduction.

## `reference/deepseek-harness/docs/subsystems/` Index — Runtime API references

- `core.md`, `system-prompt.md`, `session.md`, `conversation.md` — Lifecycle events, prompt registrations, durable messages, and projected conversation.
- `llm-streaming.md`, `tools.md`, `scope.md` — Model adapter, tool dispatch, and scoped service/event API.
- `compaction.md`, `session-projection.md`, `persistence.md` — Context reduction and durable state APIs.
