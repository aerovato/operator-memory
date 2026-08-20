---
description: Bundled Operator adapter source and tests for Code Puppy
read_if: Working in packages/code-puppy or changing Code Puppy preamble injection and commands
---

# Operator Code Puppy Index

## Coverage

- `packages/code-puppy/`

## Architecture

- The adapter is a helper-installed Python user plugin rather than a Bun workspace package. It delegates rendering to `operator-helper preamble` and uses Code Puppy callbacks plus Pydantic AI's public model wrapper API.
- One process-local asynchronous task per conversation renders immutable content. A final model-boundary transform inserts one marked synthetic user request without mutating history or active instructions.

## `packages/code-puppy/` Index

- `README.md` — Local adapter development, environment, and scoped or workspace verification instructions
- `pyproject.toml`, `uv.lock` — Non-publishable pinned Code Puppy development environment

### `operator/`

- `register_callbacks.py` — Model wrapper, conversation cache, diagnostics, commands, callback registration, and non-blocking automatic update trigger

### `tests/`

- `test_operator_plugin.py` — Request transformation, immutability, conversation isolation, diagnostics, lifecycle, command, and update-launch coverage
