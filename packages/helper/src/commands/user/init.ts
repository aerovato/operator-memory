import { Effect, Path } from "effect";

import { ensurePrivateDirectory, writeTextIfMissing } from "../../filesystem.ts";
import { renderTable } from "../../output.ts";
import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliContext } from "../../utils.ts";
import { USER_PATH } from "./common.ts";

export const userInit = Effect.fn("userInit")(function* (context: CliContext) {
  const pathService = yield* Path.Path;
  yield* ensurePrivateDirectory(pathService.join(context.home, ".operator"));
  const template = readTemplate(TemplatePath.UserOperator);
  const path = pathService.join(context.home, ".operator", "user", "operator.md");
  const written = yield* writeTextIfMissing(path, template);

  return written === "created"
    ? {
        exitCode: 0,
        output: `✓ User Instructions Initialized\n${renderTable([["Created", USER_PATH]])}`,
      }
    : {
        exitCode: 0,
        output: `✓ User Instructions Found\n${renderTable([["Unmodified", USER_PATH]])}`,
      };
});
