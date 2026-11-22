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

## `references/` Index

Every tree is a depth-1 default-branch checkout. These are source snapshots, with no guarantee that HEAD matches either product's installed runtime.

- `copilot-cli/` — [github/copilot-cli](https://github.com/github/copilot-cli/tree/c41b148a2a85a8502c9e7bf73cb4d04d707f6576), `c41b148a2a85a8502c9e7bf73cb4d04d707f6576`, November 21, 2026.
- `copilot-sdk/` — [microsoft/copilot-sdk](https://github.com/microsoft/copilot-sdk/tree/d73005fa87c82b44ac0a5d8ed5b209372591a32e), `d73005fa87c82b44ac0a5d8ed5b209372591a32e`, November 21, 2026. The upstream snapshot identifies SDK `2.0.2-preview.5`.
- `vscode/` — [microsoft/vscode](https://github.com/microsoft/vscode/tree/733a99842b0e0e14c3593dfab31fff2035478ba0), `733a99842b0e0e14c3593dfab31fff2035478ba0`, November 21, 2026. Checkout uses LFS pointers for LFS assets. The inspected TypeScript sources, manifests, and tests are present.
