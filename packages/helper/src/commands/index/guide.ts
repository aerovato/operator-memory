import { Effect } from "effect";

import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliResult } from "../../utils.ts";

export function indexGuide(): Effect.Effect<CliResult> {
  return Effect.succeed({
    exitCode: 0,
    output: `Follow the agent instructions below to build or refresh the Project Index.\n\n${readTemplate(TemplatePath.ProjectIndexSetup)}`,
  });
}
