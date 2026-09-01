import { Effect, PlatformError, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { type CliContext, getErrorMessage } from "../../utils.ts";

const OPENCODE_V2_PLUGIN = "@aerovato/operator-opencode-v2@latest";

export const installOpenCodeV2 = Effect.fn("installOpenCodeV2")(function* (context: CliContext) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const command = ChildProcess.make("opencode2", ["plugin", "add", OPENCODE_V2_PLUGIN], {
    cwd: context.cwd,
    env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
    extendEnv: true,
  });
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
    return { exitCode: 1, output: `✗ Could not run opencode2: ${message}` };
  }
  const output = [execution.success.stdout.trim(), execution.success.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  return execution.success.exitCode === 0
    ? { exitCode: 0, output }
    : {
        exitCode: execution.success.exitCode,
        output: output || "OpenCode V2 plugin installation failed",
      };
});
