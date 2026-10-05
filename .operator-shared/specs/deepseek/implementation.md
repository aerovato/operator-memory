# DeepSeek Harness Adapter Implementation

Last Updated: October 2, 2026

How `@aerovato/operator-deepseek` binds the general adapter contract to DeepSeek Harness. Command meaning and setup workflows stay in [`commands.md`](../commands.md) and [`../reference/implementation.md`](../reference/implementation.md).

## Package

The published package is both a Cordis Host plugin and an installable DeepSeek bundle. Its `cordis.patch.yml` mounts the plugin under the stable `operator-memory` row. The build bundles `@aerovato/operator-core` and leaves DeepSeek runtime packages as compatible peers. All runtime peers carry `peerDependenciesMeta: optional: true`: profile installs run pnpm with `autoInstallPeers: false` and resolve the runtime from the dsh installation, not the profile's `node_modules`, so required peers would trip pnpm's "Issues with peer dependencies" warning on every install. dsh's own compatibility gate reads the `peerDependencies` ranges and ignores the meta, so version enforcement is unchanged.


## Preamble Injection

The adapter registers one asynchronous `system-prompt/assemble` waterfall listener. The first assembly for a live Agent renders the complete Core preamble from that Agent's Session `cwd`, falling back to the Host working directory when the Session has no explicit `cwd`. A `WeakMap` caches the render promise by live Agent, coalescing concurrent first assemblies and retaining byte-stable content for later steps, retries, and tool-driven turns.

Every assembly prepends the cached content as a literal `operator:memory` system-prompt section with interpolation disabled. DeepSeek persists assembled system prompts into Session history; this is the accepted persisted-context pathway. Fresh, resumed, compacted, forked, and in-process spawned Agents all pass through the same assembly listener and receive their own render. Out-of-process delegated harnesses do not inherit the Host plugin.

A rendered partition failure is successful canonical Core output and is injected unchanged. An unexpected resolution failure rejects prompt assembly and blocks the affected model call; no fallback or partial preamble is sent. Agentless diagnostic assemblies delegate without rendering.

## Commands

When the active composition supplies DeepSeek's optional `commands` service, the adapter registers:

- `/operator-user-init`
- `/operator-project-init`
- `/operator-index`
- `/operator-repair`

The hyphenated names are the DeepSeek-compatible equivalents of the preferred colon names. Each handler sends one identified follow-up message instructing the Agent to check Helper's version, upgrade when outdated, run the workflow operation, and handle failures directly. Cancellation prevents handoff.

Profiles without the command service still receive preamble injection.

## Web UI

Web and Desktop show `Operator Ready (vX.Y.Z)` as the first pill in the composer dock, to the left of the Harness's other readings, when the Client plugin is installed and active. The text-only, non-selectable pill has no border and uses the adjacent pills' hover background and text-color treatment. It indicates adapter availability, not successful memory loading for the current Session. Profiles without a Web Client have no indicator.

## Installation And Updates

`operator-helper install deepseek` invokes DeepSeek's native package command independently for `web` and `desktop`. A successful profile remains installed if the other fails, and Helper reports both results plus the manual named-profile command.

Desktop exclusively owns its profile and package state. Its installation requires Desktop's own installed `dsh` runtime after the application has initialized the profile and fully quit; the independent npm CLI cannot manage it. Desktop's Plugins page is an equivalent installation surface.

Named profiles use:

```text
dsh plugin --profile <profile-name> add @aerovato/operator-deepseek
```

DeepSeek's native profile package operation owns updates. Profile processes must restart after bundle installation or replacement.

## Differences From Reference

Pathway selections: bundled-Core resolution, persisted system-prompt contribution, DeepSeek-compatible hyphenated slash commands, availability-only Web indicator, and native profile package management. All are accepted reference pathways; there are no behavioral deviations.

## Verification

Focused tests cover Client indicator registration, concurrent render coalescing, stable per-Agent content, independent Agents, canonical diagnostics, fatal failures, agentless assemblies, instruction-based commands, cancellation, and independent Web/Desktop installation outcomes.

The built bundle installs into clean Web and `sdk-minimal` profiles. Web starts with the Host plugin active without opening a browser; `sdk-minimal` starts and exits cleanly without an interactive command service.
