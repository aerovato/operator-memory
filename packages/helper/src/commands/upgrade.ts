import { Effect } from "effect";

import { upgradeHelper } from "../update.ts";
import type { CliContext } from "../utils.ts";

export const upgrade = Effect.fn("upgrade")(function* (context: CliContext) {
  const result = yield* upgradeHelper(context);
  switch (result.status) {
    case "current":
      return { exitCode: 0, output: `Operator Helper ${context.version} is up to date.` };
    case "updated":
      return { exitCode: 0, output: `Operator Helper updated to ${result.latest}.` };
    case "unknown":
      return {
        exitCode: 1,
        output: `Operator Helper ${result.latest} is available, but the update could not determine whether Bun or npm owns this installation. Update operator-helper manually using the original installation method.`,
      };
    case "failed":
      return { exitCode: 1, output: result.message };
  }
});
