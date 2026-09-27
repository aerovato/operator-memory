import { Effect } from "effect";

import type { CliContext } from "../../utils.ts";
import { runProcess } from "../common.ts";

const PI_PLUGIN = "npm:@aerovato/operator-pi";

export const installPi = Effect.fn("installPi")(function* (context: CliContext) {
  const execution = yield* runProcess("pi", ["install", PI_PLUGIN], context.cwd, null);
  if (!execution.ok) {
    return { exitCode: 1, output: `✗ Could not run pi: ${execution.error}` };
  }
  return execution.exitCode === 0
    ? { exitCode: 0, output: execution.output }
    : {
        exitCode: execution.exitCode,
        output: execution.output || "Pi plugin installation failed",
      };
});
