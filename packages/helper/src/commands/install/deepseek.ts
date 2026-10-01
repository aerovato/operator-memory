import { Effect } from "effect";

import type { CliContext, CliResult } from "../../utils.ts";
import { type ProcessResult, runProcess } from "../common.ts";

const DEEPSEEK_PLUGIN = "@aerovato/operator-deepseek";
const MANUAL_INSTALL_HINT = `To install a profile manually, run:

  dsh plugin --profile <profile-name> add ${DEEPSEEK_PLUGIN}

If the desktop profile was not installed, quit the desktop application and install manually.`;

export const installDeepSeek = Effect.fn("installDeepSeek")(function* (context: CliContext) {
  const web = yield* installProfile("web", context.cwd);
  const desktop = yield* installProfile("desktop", context.cwd);
  return {
    exitCode: web.exitCode === 0 && desktop.exitCode === 0 ? 0 : 1,
    output: [web.output, desktop.output, "", MANUAL_INSTALL_HINT].join("\n"),
  } satisfies CliResult;
});

function installProfile(profile: "web" | "desktop", cwd: string) {
  return runProcess(
    "dsh",
    ["plugin", "--profile", profile, "add", DEEPSEEK_PLUGIN],
    cwd,
    null,
  ).pipe(Effect.map(result => profileResult(profile, result)));
}

function profileResult(profile: "web" | "desktop", result: ProcessResult): CliResult {
  const label = profile === "web" ? "Web" : "Desktop";
  if (!result.ok) return { exitCode: 1, output: `✗ ${label}: Could not run dsh: ${result.error}` };
  if (result.exitCode !== 0) {
    return {
      exitCode: result.exitCode,
      output: `✗ ${label}: ${result.output || "Plugin installation failed"}`,
    };
  }
  return { exitCode: 0, output: `✓ ${label}: ${result.output || "Plugin installed"}` };
}
