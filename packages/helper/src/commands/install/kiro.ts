import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { Effect } from "effect";

import { KIRO_FILES } from "../../templates/kiro.ts";
import { type CliContext, type CliResult, getErrorMessage } from "../../utils.ts";
import { runProcess } from "../common.ts";

export const installKiro = Effect.fn("installKiro")(function* (context: CliContext) {
  const helper = yield* runProcess("operator-helper", ["help"], context.cwd, null);
  if (!helper.ok) {
    return { exitCode: 1, output: `✗ Operator Helper must be available on PATH: ${helper.error}` };
  }
  if (helper.exitCode !== 0) {
    return {
      exitCode: helper.exitCode,
      output: helper.output || "Operator Helper must be available on PATH",
    };
  }
  return yield* writeKiroFiles(join(context.home, ".kiro"));
});

function writeKiroFiles(kiroHome: string): Effect.Effect<CliResult> {
  return Effect.promise(async () => {
    try {
      for (const file of KIRO_FILES) {
        const path = join(kiroHome, file.path);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, file.content);
      }
    } catch (error) {
      return {
        exitCode: 1,
        output: `✗ Could not install the Kiro adapter: ${getErrorMessage(error)}`,
      };
    }
    return {
      exitCode: 0,
      output: `✓ Kiro adapter installed in ${kiroHome}\nStart a new Kiro session.`,
    };
  });
}
