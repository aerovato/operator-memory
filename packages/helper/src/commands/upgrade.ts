import { Effect, Option, PlatformError, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { NpmRegistry } from "../npm-registry.ts";
import { type CliContext, getErrorMessage } from "../utils.ts";

const HELPER_PACKAGE = "@aerovato/operator-helper";

type InstallationChannel = "bun" | "npm" | "unknown";

export const updateNotice = Effect.fn("updateNotice")(function* (currentVersion: string) {
  const registry = yield* NpmRegistry.Service;
  const latest = yield* registry.latestVersion(HELPER_PACKAGE).pipe(Effect.option);
  if (Option.isNone(latest) || !isNewerVersion(currentVersion, latest.value)) {
    return null;
  }
  return `Operator Helper ${latest.value} is available. Run operator-helper upgrade.`;
});

export const upgrade = Effect.fn("upgrade")(function* (context: CliContext) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const channel = yield* detectInstallationChannel(spawner, context.cwd);
  if (channel === "unknown") {
    return {
      exitCode: 1,
      output: `✗ ${[
        "Could not determine how Operator Helper was installed.",
        "Upgrade manually using your original installation method.",
        "",
        "bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest",
        "NPM_CONFIG_MIN_RELEASE_AGE=0 npm install --global @aerovato/operator-helper@latest",
      ].join("\n")}`,
    };
  }

  const command =
    channel === "bun"
      ? ChildProcess.make(
          "bun",
          ["add", "--global", "--minimum-release-age", "0", `${HELPER_PACKAGE}@latest`],
          { cwd: context.cwd },
        )
      : ChildProcess.make("npm", ["install", "--global", `${HELPER_PACKAGE}@latest`], {
          cwd: context.cwd,
          env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
          extendEnv: true,
        });
  const execution = yield* run(spawner, command).pipe(Effect.result);
  if (Result.isFailure(execution)) {
    const message =
      execution.failure instanceof PlatformError.PlatformError
        ? (execution.failure.reason.description ?? execution.failure.message)
        : getErrorMessage(execution.failure);
    return {
      exitCode: 1,
      output: `✗ ${[
        `Could not upgrade with ${channel}: ${message}`,
        "",
        "Upgrade manually using your original installation method.",
        "",
        "bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest",
        "NPM_CONFIG_MIN_RELEASE_AGE=0 npm install --global @aerovato/operator-helper@latest",
      ].join("\n")}`,
    };
  }
  const output = [execution.success.stdout.trim(), execution.success.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  return execution.success.exitCode === 0
    ? { exitCode: 0, output }
    : {
        exitCode: execution.success.exitCode,
        output: output || "Operator Helper upgrade failed",
      };
});

function detectInstallationChannel(
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  cwd: string,
): Effect.Effect<InstallationChannel> {
  return Effect.gen(function* () {
    const [bun, npm] = yield* Effect.all(
      [
        hasGlobalPackage(spawner, "bun", ["pm", "ls", "--global"], cwd),
        hasGlobalPackage(
          spawner,
          "npm",
          ["list", "--global", HELPER_PACKAGE, "--depth=0", "--json"],
          cwd,
        ),
      ] as const,
      { concurrency: "unbounded" },
    );
    if (bun === npm) return "unknown";
    return bun ? "bun" : "npm";
  });
}

function hasGlobalPackage(
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  executable: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<boolean> {
  return run(spawner, ChildProcess.make(executable, args, { cwd })).pipe(
    Effect.map(
      result =>
        result.exitCode === 0 && `${result.stdout}\n${result.stderr}`.includes(HELPER_PACKAGE),
    ),
    Effect.orElseSucceed(() => false),
  );
}

function run(
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  command: ChildProcess.Command,
) {
  return Effect.scoped(
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
  );
}

function isNewerVersion(current: string, latest: string): boolean {
  const left = parseVersion(current);
  const right = parseVersion(latest);
  if (left === null || right === null) return false;
  for (let index = 0; index < 3; index += 1) {
    const currentPart = left[index];
    const latestPart = right[index];
    if (currentPart === undefined || latestPart === undefined) return false;
    if (latestPart !== currentPart) return latestPart > currentPart;
  }
  return false;
}

function parseVersion(value: string): readonly [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
