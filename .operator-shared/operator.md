# Shared Operator Instructions

## Core Philosophy

- Keep harness plugins thin so new harnesses stay cheap to add and maintain.
- Put shared logic in `@aerovato/operator-core`.
- Put filesystem and install work in `@aerovato/operator-helper`, not in plugins.
- Prefer **agent-driven** flows for complex work such as setup; the harness only injects context and thin UI.
- Treat harness-only extras (for example the OpenCode TUI status icon) as optional sugar, not core behavior.

## Project Rules

- Use `bun run test [optional: packages/<package>]` for tests.
- Use `bun run check [optional: packages/<package>]` as a master command for formatting, linting, typechecking, and testing.

## Code Style

- Write extensible, maintainable, efficient, and strictly typed code.
- Prefer `const` over `let`.
- Place operators on the next line when splitting expressions.
- Avoid default and optional function arguments; require callers to pass explicit `null` or `undefined`.
- Prefer explicit `null` over optional class or interface fields.
- Prefer returning typed objects over throwing generic errors.
- Use clear, descriptive, short names and avoid abbreviations unless a full name would be unwieldy.
- Add comments only when necessary and never remove existing comments without approval.
- Keep one source of truth and avoid speculative properties, configuration, or compatibility behavior.
- Do not create barrel files (`index.ts` re-export hubs) unless explicitly asked.
- Proactively identify useful simplifications or correctness improvements without expanding scope.

## Documentation Style

- Use backticks for code formatting.
- Use bold only for important keywords or requirements, not list labels or headers.
- Do not use Markdown tables or box-drawing diagrams.
- Do not hard-wrap Markdown prose at a column limit
- Keep brain documents short and concise; split long documents with explicit links when useful.
- Keep specifications focused primarily on expected behavior and current scope.

## Shared Policy

- Publish repository-wide instructions, the main project index, and product overview in this partition.
