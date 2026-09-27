import { Effect } from "effect";

import type { CliContext } from "../../utils.ts";
import { runProcess } from "../common.ts";

const OPENCODE_V2_PLUGIN = "@aerovato/operator-opencode-v2@latest";

export const installOpenCodeV2 = Effect.fn("installOpenCodeV2")(function* (context: CliContext) {
  const execution = yield* runProcess(
    "opencode",
    ["plugin", "add", OPENCODE_V2_PLUGIN],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  if (!execution.ok) {
    return { exitCode: 1, output: `✗ Could not run opencode: ${execution.error}` };
  }
  return execution.exitCode === 0
    ? { exitCode: 0, output: execution.output }
    : {
        exitCode: execution.exitCode,
        output: execution.output || "OpenCode V2 plugin installation failed",
      };
});
