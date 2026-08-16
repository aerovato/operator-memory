import { Effect, Path } from "effect";

import { readOptionalText } from "../../filesystem.ts";
import { renderTable } from "../../output.ts";
import type { CliContext } from "../../utils.ts";
import { USER_PATH } from "./common.ts";

export const userStatus = Effect.fn("userStatus")(function* (context: CliContext) {
  const pathService = yield* Path.Path;
  const path = pathService.join(context.home, ".operator", "user", "operator.md");
  const content = yield* readOptionalText(path);
  if (content === null) {
    return {
      exitCode: 0,
      output: `User Partition: ~/.operator/user

✗ User Instructions Missing
${renderTable([["User Instructions", `Missing (${USER_PATH})`]])}

For Users: Run \`/operator:user-init\` in your harness to initialize.
For Agents: Run \`operator-helper user init\`, then \`operator-helper user guide\`, and follow the guide.`,
    };
  }

  return {
    exitCode: 0,
    output: `User Partition: ~/.operator/user

✓ User Instructions Found
${renderTable([["User Instructions", `${USER_PATH} (${Buffer.byteLength(content)} bytes)`]])}`,
  };
});
