import { Effect } from "effect";

import { checkForUpdate } from "../update.ts";
import type { CliContext } from "../utils.ts";

export const version = Effect.fn("version")(function* (context: CliContext) {
  const latest = yield* checkForUpdate(context.version).pipe(
    Effect.catch(error => Effect.succeed({ status: "failed" as const, message: error.message })),
  );
  if (latest.status === "failed") {
    return { exitCode: 1, output: `Operator Helper ${context.version}\n${latest.message}` };
  }
  if (latest.status === "available") {
    return {
      exitCode: 0,
      output: `Operator Helper ${context.version}\nUpdate available: ${latest.latest}. Run \`operator-helper upgrade\`.`,
    };
  }
  return { exitCode: 0, output: `Operator Helper ${context.version} is up to date.` };
});
