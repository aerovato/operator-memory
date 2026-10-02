---
name: operator-user-init
description: Initialize and configure the Operator User Partition.
---

# Operator User Setup

1. Run `operator-helper user init` once. If Helper cannot start, help the user repair it, verify the repair, ask them to invoke `$operator-user-init` again, and stop.
2. Follow the emitted User Setup guide with the user, including when initialization reports failures. Preserve and address the reported failure details.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
