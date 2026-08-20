#!/bin/sh

status=0
target=${1:-}

check_code_puppy() {
  uv run --locked --project packages/code-puppy ruff check packages/code-puppy || status=1
  uv run --locked --project packages/code-puppy ruff format --check packages/code-puppy || status=1
  uv run --locked --project packages/code-puppy pytest packages/code-puppy/tests || status=1
}

if [ "$#" -gt 1 ]; then
  printf '%s\n' 'Usage: bun run check [packages/<package>]' >&2
  exit 1
fi

if [ -n "$target" ]; then
  if [ "$target" = "packages/code-puppy" ]; then
    check_code_puppy
    exit "$status"
  fi

  if [ ! -f "$target/tsconfig.check.json" ]; then
    printf 'Package check configuration not found: %s/tsconfig.check.json\n' "$target" >&2
    exit 1
  fi

  if ! bun x biome format "$target"; then
    bun x biome format --write "$target" || status=1
    status=1
  fi

  bun x biome lint "$target" || status=1
  bun x tsc --noEmit --project "$target/tsconfig.check.json" || status=1
  bun x vitest run "$target" || status=1

  exit "$status"
fi

if ! bun run format:check; then
  bun run format || status=1
  status=1
fi

bun run lint || status=1
bun run typecheck || status=1
bun run test || status=1
check_code_puppy

exit "$status"
