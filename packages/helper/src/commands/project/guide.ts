import { Effect } from "effect";

import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliResult } from "../../utils.ts";

export function projectGuide(): Effect.Effect<CliResult> {
  return Effect.succeed({
    exitCode: 0,
    output: `Follow the agent instructions below to complete Project Setup.\n\n${readTemplate(TemplatePath.ProjectSetup)}`,
  });
}
