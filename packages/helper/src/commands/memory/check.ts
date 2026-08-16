import { loadMemorySnapshot, type MemorySnapshot } from "@aerovato/operator-core/memory/load";
import { Effect } from "effect";

import { type CliContext, getErrorMessage } from "../../utils.ts";

export const memoryCheck = Effect.fn("memoryCheck")(function* (context: CliContext) {
  const snapshot = yield* Effect.promise(() => loadMemorySnapshot(context.cwd, context.home, true));
  const lines = [`Memory Check: ${context.cwd}`];
  let failed = false;

  for (const [name, result] of entries(snapshot)) {
    if (result.ok) {
      lines.push(`✓ ${name}: ${result.value.exists ? "Loaded" : "Uninitialized"}`);
      continue;
    }

    failed = true;
    lines.push(
      `✗ ${name}: Error`,
      `    Path: ${result.error.path}`,
      `    Cause: ${getErrorMessage(result.error.cause)}`,
    );
  }

  if (!failed) {
    lines.push("\nNo issues detected.");
  }

  return { exitCode: failed ? 1 : 0, output: lines.join("\n") };
});

function entries(snapshot: MemorySnapshot) {
  return [
    ["Shared", snapshot.shared],
    ["User", snapshot.user],
    ["Private", snapshot.private],
  ] as const;
}
