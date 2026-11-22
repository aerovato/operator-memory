---
description: GitHub Copilot CLI release tree and Copilot SDK hook, event, plugin, and session boundaries
read_if: Implementing Copilot plugin format, hooks or install behavior, or checking what the public SDK establishes about the native runtime
---

# Copilot Runtime and Format Sources

## Coverage

- `references/copilot-cli/` and `references/copilot-sdk/`. See the [checkout pins and commands](overview.md#source-checkout).

## Architecture

- CLI releases expose the terminal client and a bundled runtime distribution. The SDK drives a standalone native runtime via JSON-RPC. VS Code provisions its own SDK version and session policy.
- GitHub documents the [CLI plugin layouts](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference) and the [native hook contract](https://docs.github.com/en/copilot/reference/hooks-reference). The [runtime checks](../../../guides/github-copilot/injection.md#verification-notes) record behavior observed in the shipped CLI.

## `references/copilot-cli/` Index

- `README.md` — Distribution channels and prerequisites.
- `changelog.md` — Versioned CLI behavior changes, including hook output, discovery, and update corrections.
- `install.sh`, `container/` — Installer, container packaging, and distribution smoke tests.
- `.github/`, `LICENSE.md` — Ditto.

## `references/copilot-sdk/` Index

- `README.md`, `sdk-protocol-version.json` — Runtime boundary and protocol version.
- `nodejs/src/types.ts`, `nodejs/src/optionsCompatibility.ts` — Host-side session options and callback contracts.
- `nodejs/src/client.ts`, `nodejs/src/session.ts` — Runtime connection and callback dispatch.
- `nodejs/src/generated/rpc.ts`, `nodejs/src/generated/session-events.ts` — Runtime wire and journal types.
- `nodejs/docs/`, `nodejs/examples/` — TypeScript SDK documentation and examples.
- `docs/hooks/session-lifecycle.md`, `docs/features/hooks.md` — SDK hook callbacks, payloads and examples.
- `docs/features/plugin-directories.md`, `docs/features/customization-locations.md`, `docs/features/session-persistence.md` — Discovery, validation, installed resources and lifecycle.
- `docs/setup/`, `samples/` — Runtime setup and client examples.
- `dotnet/`, `go/`, `java/`, `python/`, `rust/` — Other language SDK implementations.
- `assets/` — Repository assets.
- `.github/`, `.vscode/`, `BUILD.bazel`, `CODE_OF_CONDUCT.md`, `LICENSE`, `SECURITY.md`, `SUPPORT.md`, `vitest.config.ts` — Ditto.
- `CHANGELOG.md` — SDK releases and breaking changes.
