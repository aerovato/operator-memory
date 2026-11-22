---
description: GitHub Copilot CLI release materials, Copilot SDK boundary and VS Code Agent Host source pins
read_if: Researching plugin packaging, context injection, SDK boundaries, or the VS Code integration for GitHub Copilot
---

# GitHub Copilot Source References

## Coverage

- `references/copilot-cli/`, `references/copilot-sdk/`, and `references/vscode/`.
- [Copilot runtime and format map](runtime.md) covers CLI release materials, official packaging documentation, and the SDK.
- [VS Code source map](vscode.md) covers Agent Host, built-in extension and workbench.
- [Copilot harness guides](../../../guides/github-copilot/overview.md) own observed behavior and implementation tradeoffs.

## Architecture

- The public CLI repository distributes installers, release artifacts, and change history. The public SDK supplies client bindings, event/RPC schema, and documentation for the separately distributed native runtime.
- Microsoft maintains the open VS Code Copilot integration in `extensions/copilot/` and the Agent Host in `src/vs/platform/agentHost/`. The archived standalone Copilot Chat extension repository predates this layout.

## Source checkout

These source snapshots were recorded November 21, 2026; they do not establish installed runtime versions. Run only the commands for the required repository, from the Operator repository root.

### Copilot CLI

- Upstream: https://github.com/github/copilot-cli.git
- Destination: `references/copilot-cli/`
- Commit: `c41b148a2a85a8502c9e7bf73cb4d04d707f6576`
- Tracking branch: `main`

```sh
git clone --no-checkout --depth 1 --branch main https://github.com/github/copilot-cli.git references/copilot-cli
git -C references/copilot-cli fetch --depth 1 origin c41b148a2a85a8502c9e7bf73cb4d04d707f6576
git -C references/copilot-cli switch --detach c41b148a2a85a8502c9e7bf73cb4d04d707f6576
```

### Copilot SDK

- Upstream: https://github.com/microsoft/copilot-sdk.git
- Destination: `references/copilot-sdk/`
- Commit: `d73005fa87c82b44ac0a5d8ed5b209372591a32e`
- Tracking branch: `main`

The upstream snapshot identifies SDK `2.0.2-preview.5`.

```sh
git clone --no-checkout --depth 1 --branch main https://github.com/microsoft/copilot-sdk.git references/copilot-sdk
git -C references/copilot-sdk fetch --depth 1 origin d73005fa87c82b44ac0a5d8ed5b209372591a32e
git -C references/copilot-sdk switch --detach d73005fa87c82b44ac0a5d8ed5b209372591a32e
```

### VS Code

- Upstream: https://github.com/microsoft/vscode.git
- Destination: `references/vscode/`
- Commit: `733a99842b0e0e14c3593dfab31fff2035478ba0`
- Tracking branch: `main`

The checkout uses LFS pointers for LFS assets. The inspected TypeScript sources, manifests, and tests are present.

```sh
git clone --no-checkout --depth 1 --branch main https://github.com/microsoft/vscode.git references/vscode
git -C references/vscode fetch --depth 1 origin 733a99842b0e0e14c3593dfab31fff2035478ba0
git -C references/vscode switch --detach 733a99842b0e0e14c3593dfab31fff2035478ba0
```
