import { Effect, PlatformError, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { type CliContext, getErrorMessage } from "../../utils.ts";

const PI_PLUGIN = "npm:@aerovato/operator-pi";

export const installPi = Effect.fn("installPi")(function* (context: CliContext) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const command = ChildProcess.make("pi", ["install", PI_PLUGIN], { cwd: context.cwd });
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
    return { exitCode: 1, output: `✗ Could not run pi: ${message}` };
  }
  const output = [execution.success.stdout.trim(), execution.success.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  return execution.success.exitCode === 0
    ? { exitCode: 0, output }
    : {
        exitCode: execution.success.exitCode,
        output: output || "Pi plugin installation failed",
      };
});
