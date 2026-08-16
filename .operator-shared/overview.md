# Operator Memory

Operator Memory: Durable context for agent-driven development.

Operator Memory turns agent work into lasting project knowledge. The MVP targets OpenCode and injects durable project and user context from markdown files agents own and maintain.

The Bun/TypeScript monorepo has three packages:

- `@aerovato/operator-core` — private, harness-agnostic runtime loading and preamble generation
- `@aerovato/operator-helper` — published setup, filesystem, Git, status, guide, and lint CLI
- `@aerovato/operator-opencode` — published OpenCode plugin and harness adapter

Runtime code uses portable Node APIs. Bun owns workspace management, dependency installation, building, and tests.
