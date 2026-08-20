# Operator Code Puppy Adapter

This directory contains the Python plugin bundled and installed by `operator-helper install code-puppy`. It is not published as a Python package; Code Puppy loads `operator/register_callbacks.py` directly and provides the runtime imports.

For local development, install the pinned host and test dependencies:

```sh
uv sync --project packages/code-puppy
```

Configure the Python language server to use `packages/code-puppy/.venv`. Run its scoped check from the repository root; unscoped `bun run check` includes the same Python checks alongside the TypeScript workspace:

```sh
bun run check packages/code-puppy
```
