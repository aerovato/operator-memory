# DeepSeek Harness Integration Guide

Last Updated: October 3, 2026

Source: local shallow clone of `deepseek-ai/deepseek-harness` at `references/deepseek-harness/`. Operator's adapter requirements live in [`reference/implementation.md`](../../specs/reference/implementation.md), [`preamble.md`](../../specs/preamble.md), and [`commands.md`](../../specs/commands.md); the implemented binding is [`deepseek/implementation.md`](../../specs/deepseek/implementation.md).

## Guide Map

- [`runtime.md`](runtime.md) — agent lifecycle, prompt and history seams, cwd, resume, compaction, delegation, and accepted persisted-context injection.
- [`plugins-and-commands.md`](plugins-and-commands.md) — Cordis plugin authoring, commands, supported UI surfaces, agent handoff, and hyphenated command names.
- [`installation.md`](installation.md) — packages, profile bundles, CLI/Web/Desktop installation, updates, and test surfaces.

## Integration Boundary

DeepSeek Harness is a Node/TypeScript Cordis plugin tree, not a monolithic extension API. `dsh` boots named profiles assembled from ordered bundle patches, profile/home overrides, and invocation overlays. A host plugin can depend on services (`ctx.inject`), register disposable effects (`ctx.effect`, `ctx.on`), and contribute agent-local behavior. Agent presets are a separate per-session composition. The dynamic `cordis-host-runner` facility is process-local and not a replacement for a persistent installed package.

DeepSeek's documented prompt seams persist model-visible text in Session history, and its command grammar rejects `:`; the binding uses the persisted-context pathway and hyphenated slash names. Out-of-process delegated children have their own runtime and cannot be assumed to inherit a Host plugin.

Sources: `references/deepseek-harness/docs/architecture.md`, `docs/cordis-primer.md`, `packages/core/agent-loop/README.md`, `packages/interaction/commands/src/index.ts`.
