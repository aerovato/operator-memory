---
name: operator-user-init
description: Initialize and configure the Operator User Partition.
---

# Operator User Setup

1. Run `operator-helper version`. If Helper is unavailable, help the user repair it, verify the repair, ask them to invoke `$operator-user-init` again, and stop.
2. Run `operator-helper user init`.
3. Run `operator-helper user guide`, even if initialization fails.
4. Follow the emitted User Setup guide with the user.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
