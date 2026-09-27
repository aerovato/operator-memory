---
name: operator-index
description: Build or refresh the Operator Project Index.
---

# Operator Project Index Setup

1. Run `operator-helper version`. If Helper is unavailable, help the user repair it, verify the repair, ask them to invoke `$operator-index` again, and stop.
2. Run `operator-helper index status`.
3. Run `operator-helper index guide`, even if the status command fails.
4. Follow the emitted Project Index Setup guide with the user.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
