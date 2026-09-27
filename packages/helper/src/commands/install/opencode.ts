import { Effect, FileSystem, Path, Result } from "effect";

import type { CliContext } from "../../utils.ts";
import { runProcess } from "../common.ts";

const OPENCODE_PLUGIN = "@aerovato/operator-opencode@latest";

export const installOpenCode = Effect.fn("installOpenCode")(function* (context: CliContext) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const cacheRoot = process.env.XDG_CACHE_HOME || path.join(context.home, ".cache");
  const isCacheRemoved = yield* fileSystem
    .remove(path.join(cacheRoot, "opencode", "packages", "@aerovato", "operator-opencode@latest"), {
      recursive: true,
      force: true,
    })
    .pipe(Effect.result);
  if (Result.isFailure(isCacheRemoved)) {
    return {
      exitCode: 1,
      output: `✗ Could not clear the OpenCode plugin cache`,
    };
  }

  const execution = yield* runProcess(
    "opencode",
    ["plugin", OPENCODE_PLUGIN, "--global", "--force"],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  if (!execution.ok) {
    return { exitCode: 1, output: `✗ Could not run opencode: ${execution.error}` };
  }
  return execution.exitCode === 0
    ? { exitCode: 0, output: execution.output }
    : {
        exitCode: execution.exitCode,
        output: execution.output || "OpenCode plugin installation failed",
      };
});
