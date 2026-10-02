---
name: repair
description: Diagnose and repair Operator memory load failures.
disable-model-invocation: true
---

# Operator Memory Repair

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper memory check`. If no issues are detected, stop. Otherwise, repair only the reported load failures without initializing absent partitions. Rerun `operator-helper memory check` to confirm the repair, then read the applicable Operator memory documents.

## Recovery

- If Helper cannot start, install or repair the npm package `@aerovato/operator-helper` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If `operator-helper memory check` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
