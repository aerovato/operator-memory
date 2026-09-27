---
name: operator-project-init
description: Initialize and configure the Operator Project Brain.
---

# Operator Project Setup

1. Run `operator-helper version`. If Helper is unavailable, help the user repair it, verify the repair, ask them to invoke `$operator-project-init` again, and stop.
2. Run `operator-helper project init`.
3. Run `operator-helper project guide`, even if initialization fails.
4. Follow the emitted Project Setup guide with the user.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
