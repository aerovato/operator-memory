import { Effect } from "effect";

import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliResult } from "../../utils.ts";

export function userGuide(): Effect.Effect<CliResult> {
  return Effect.succeed({
    exitCode: 0,
    output: `Follow the agent instructions below to complete User Setup.\n\n${readTemplate(TemplatePath.UserSetup)}`,
  });
}
