---
name: index
description: Build or refresh the Operator Project Index.
disable-model-invocation: true
---

# Operator Project Index Setup

1. Run `operator-helper version`. If an update is available, run `operator-helper upgrade` before continuing.
2. Run `operator-helper index init` and follow the emitted Project Index Setup guide, including when inspection reports failures.

If the Project Brain is missing, tell the user to invoke `/operator:project-init` to set it up.

## Recovery

- If Helper cannot start, install or repair the npm package `@aerovato/operator-helper` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If `operator-helper index init` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
