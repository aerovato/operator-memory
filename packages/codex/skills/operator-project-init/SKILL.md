---
name: operator-project-init
description: Initialize and configure the Operator Project Brain.
---

# Operator Project Setup

1. Run `operator-helper project init` once. If Helper cannot start, help the user repair it, verify the repair, ask them to invoke `$operator-project-init` again, and stop.
2. Follow the emitted Project Setup guide with the user, including when initialization reports failures. Preserve and address the reported failure details.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
