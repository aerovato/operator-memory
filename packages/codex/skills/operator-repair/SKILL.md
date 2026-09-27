---
name: operator-repair
description: Diagnose and repair Operator memory load failures.
---

# Operator Memory Repair

1. Run `operator-helper version`. If Helper is unavailable, help the user repair it, verify the repair, ask them to invoke `$operator-repair` again, and stop.
2. Run `operator-helper memory check`.
3. If no issue is reported, stop. Otherwise, fix only the reported load failures without initializing absent partitions.
4. Run `operator-helper memory check` again. Once it succeeds, read the applicable Operator memory.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
