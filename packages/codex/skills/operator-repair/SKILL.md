---
name: operator-repair
description: Diagnose and repair Operator memory load failures.
---

# Operator Memory Repair

1. Run `operator-helper memory check` once. If Helper cannot start, help the user repair it, verify the repair, ask them to invoke `$operator-repair` again, and stop.
2. If no issue is reported, stop. Otherwise, fix only the reported load failures without initializing absent partitions.
3. Run `operator-helper memory check` again. Once it succeeds, report back to the user and ask them to start a new session.

Use Helper output as working context. Do not reproduce it for the user or reimplement Helper logic.
