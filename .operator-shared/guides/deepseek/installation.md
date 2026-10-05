# DeepSeek Harness Packaging and Installation

Last Updated: September 30, 2026

Read with [`overview.md`](overview.md). Sources below are relative to `<reference>/deepseek-harness/`.

## Profiles and Bundle Layout

`dsh` is the supported Node launcher. Shipped profiles `web`, `headless`, `sdk`, and `acp` stack `dsh-base` plus their mode bundle; `sdk-minimal` is a standalone tree. A profile under `$DSH_HOME/profiles/<name>/` has `package.json` (dependencies and ordered `dsh.profile.bundles`) and `cordis.patch.yml`. Bundle packages declare `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` in their manifest and ship that patch, whose rows mount the Host plugin. Effective order: bundles, profile patch, home `$DSH_HOME/cordis.patch.yml`, then invocation `--patch` overlays. Higher patches replace a row's whole config rather than merge fields; user overrides win. `dsh --profile <name> --dump-config` previews composition (not guaranteed activation), and `--dump-default-config` shows bundle layers only. `!!js` expressions are evaluated when the target plugin activates, not when dumped.

Installing a bare plugin dependency without bundle metadata does not activate it by itself; alternatively a user's patch can insert a plugin row explicitly. A standalone Host plugin package and a thin installable bundle can be published together if composition is needed. A bundle patch should use a stable, distinct row id. An external package declares compatible `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peers; both startup and install check declared ranges against the runtime version. Plugin code runs in the Host process, outside the agent workspace sandbox. No Operator DeepSeek package, Helper installer entry, or chosen peer range exists yet; the integration must add and test these explicitly rather than borrowing another harness's install path.

Sources: `docs/architecture.md`, `packages/boot/app-boot/README.md`, `packages/boot/plugin-manager/README.md`, `apps/cli/reference/README.md`, `packages/bundle/base/cordis.patch.yml`.

## Install and Update Surfaces

Use `dsh plugin --profile <name> add <package-or-spec>` for persistent CLI profile installation; it forwards package operations to pnpm under the profile, then reconciles installed bundle declarations. `update`, `remove`, and `why` similarly use pnpm verbs. Relative path specs are anchored to the invoking directory before forwarding; `dsh plugin --profile <name> add .` works from a built package checkout. For Web, the Plugin Manager can inspect/install bundles and edit profile selection; Host changes with HMR apply live when enabled, while headless, SDK and ACP default to startup-only patches. Replacing an already imported package version needs a process restart to load new JS. Desktop owns a reserved `desktop` profile and uses its bundled command/runtime and shell-managed plugin transaction, not the ordinary npm CLI's desktop profile command. Profile operations affect all sessions on that profile. Do not implement adapter-side package-store mutation or claim that Helper already supports `install deepseek`.

Install-time version compatibility is enforced through DSH peers; any exact-version exemption is an explicit risk decision, not a default installer tactic. Pnpm build-script approvals are separate. The Operator reference calls for a detached `operator-helper version` check per adapter runtime and Helper-owned installation; implementing a new DeepSeek Helper installer requires its own integration work. Native update and optional status UI are not prerequisites for preamble functionality.

Sources: `apps/cli/README.md`, `apps/cli/reference/README.md`, `packages/boot/plugin-manager/README.md`, `packages/boot/app-boot/README.md`.

## Verification Targets for a Future Adapter

Validate the built package installed as a bundle into a clean profile, not only a workspace-linked source tree. Test fresh and resumed sessions, concurrent first requests, tool steps, retries, compaction, fork/spawn children, cwd resolution, partition-load diagnostics, unexpected read failures, unload/reload, and Web command-to-agent handoff. Verify `sdk-minimal` separately: it does not share base composition or instruction discovery. Check both a live-reloading Web profile and a startup-only profile after restart; test CLI command discovery separately from UI-less SDK/ACP/headless use. Verify model input and Session log behavior together against `packages/core/agent-loop/src/invariant.ts` for the chosen persisted-context pathway; do not claim immutable out-of-history injection without evidence. Use the hyphenated slash names in [`plugins-and-commands.md`](plugins-and-commands.md). Persistence and command grammar alone do not require another product decision.
