import { Effect, FileSystem, Path, PlatformError, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { type CliContext, getErrorMessage } from "../../utils.ts";

const OPENCODE_PLUGIN = "@aerovato/operator-opencode@latest";

export const installOpenCode = Effect.fn("installOpenCode")(function* (context: CliContext) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

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

  const command = ChildProcess.make(
    "opencode",
    ["plugin", OPENCODE_PLUGIN, "--global", "--force"],
    {
      cwd: context.cwd,
      env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
      extendEnv: true,
    },
  );
  const execution = yield* Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* spawner.spawn(command);
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
          handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
          handle.exitCode,
        ] as const,
        { concurrency: "unbounded" },
      );
      return { stdout, stderr, exitCode: Number(exitCode) };
    }),
  ).pipe(Effect.result);

  if (Result.isFailure(execution)) {
    const message =
      execution.failure instanceof PlatformError.PlatformError
        ? (execution.failure.reason.description ?? execution.failure.message)
        : getErrorMessage(execution.failure);
    return { exitCode: 1, output: `✗ Could not run opencode: ${message}` };
  }
  const output = [execution.success.stdout.trim(), execution.success.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  return execution.success.exitCode === 0
    ? { exitCode: 0, output }
    : {
        exitCode: execution.success.exitCode,
        output: output || "OpenCode plugin installation failed",
      };
});
