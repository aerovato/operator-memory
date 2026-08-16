import { Effect } from "effect";

import { lintProjectIndexes } from "../../lint.ts";
import type { CliContext } from "../../utils.ts";

export const indexLint = Effect.fn("indexLint")(function* (context: CliContext) {
  const findings = yield* lintProjectIndexes(context.cwd);
  const lines = [`Project: ${context.cwd}`, ""];
  if (findings.length === 0) {
    lines.push("✓ No issues found");
  } else {
    for (const finding of findings) {
      lines.push(`${finding.error ? "✗" : "⚠"} ${finding.path}`, `    ${finding.message}`, "");
    }
    lines.pop();
  }
  return {
    exitCode: findings.some(finding => finding.error) ? 1 : 0,
    output: lines.join("\n"),
  };
});
