import { Effect, Path, Result } from "effect";

import { ensurePrivateDirectory, writeTextIfMissing } from "../../filesystem.ts";
import { renderTable } from "../../output.ts";
import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliContext } from "../../utils.ts";
import { fileErrorMessage, fileFailure } from "../common.ts";
import { USER_FILES, USER_ROOT } from "./common.ts";

export const userInit = Effect.fn("userInit")((context: CliContext) =>
  Effect.gen(function* () {
    const pathService = yield* Path.Path;
    const root = pathService.join(context.home, ".operator", "user");
    yield* ensurePrivateDirectory(pathService.join(context.home, ".operator"));

    const templates = {
      "operator.md": readTemplate(TemplatePath.UserOperator),
      "catalog.md": readTemplate(TemplatePath.UserCatalog),
    } satisfies Record<(typeof USER_FILES)[number], string>;

    const rows: string[][] = [];
    let failed = false;
    for (const file of USER_FILES) {
      const written = yield* writeTextIfMissing(pathService.join(root, file), templates[file]).pipe(
        Effect.result,
      );
      if (Result.isFailure(written)) {
        failed = true;
        rows.push(["Failed", `${USER_ROOT}/${file}: ${fileErrorMessage(written.failure)}`]);
      } else {
        rows.push([
          written.success === "created" ? "Created" : "Preserved",
          `${USER_ROOT}/${file}`,
        ]);
      }
    }

    return {
      exitCode: failed ? 1 : 0,
      output: `✓ User Partition Initialized\n${renderTable(rows)}`,
    };
  }).pipe(
    Effect.catch(error => Effect.succeed(fileFailure(error))),
    Effect.map(result => ({
      ...result,
      output: `${result.output}\n\nFollow the agent instructions below to complete User Setup.\n\n${readTemplate(TemplatePath.UserSetup)}`,
    })),
  ),
);
