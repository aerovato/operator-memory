---
name: operator-user-init
description: Initialize and configure the Operator User Partition.
---

# Operator User Setup

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper user init` and follow the emitted User Setup guide, including when initialization reports failures.

## Recovery

- If Helper cannot start, repair its installation and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If `operator-helper user init` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
