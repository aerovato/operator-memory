import { Effect, Option, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { NpmRegistry } from "./npm-registry.ts";
import type { CliContext } from "./utils.ts";

const HELPER_PACKAGE = "@aerovato/operator-helper";
const UPDATE_TIMEOUT = "60 seconds";

type InstallationChannel = "bun" | "npm" | "unknown";

export type UpdateResult =
  | { readonly status: "current" }
  | { readonly status: "updated" }
  | { readonly status: "unknown"; readonly latest: string }
  | { readonly status: "failed" };

export const autoUpdate = Effect.fn("autoUpdate")(function* (
  currentVersion: string,
  context: CliContext,
) {
  const registry = yield* NpmRegistry.Service;
  const latest = yield* registry.latestVersion(HELPER_PACKAGE).pipe(Effect.option);
  if (Option.isNone(latest) || !isNewerVersion(currentVersion, latest.value)) {
    return { status: "current" } satisfies UpdateResult;
  }

  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const channel = yield* detectInstallationChannel(spawner, context.cwd);
  if (channel === "unknown") {
    return { status: "unknown", latest: latest.value } satisfies UpdateResult;
  }

  const command =
    channel === "bun"
      ? ChildProcess.make(
          "bun",
          ["add", "--global", "--minimum-release-age", "0", `${HELPER_PACKAGE}@${latest.value}`],
          { cwd: context.cwd },
        )
      : ChildProcess.make("npm", ["install", "--global", `${HELPER_PACKAGE}@${latest.value}`], {
          cwd: context.cwd,
          env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
          extendEnv: true,
        });
  const execution = yield* run(spawner, command).pipe(
    Effect.timeout(UPDATE_TIMEOUT),
    Effect.option,
  );
  return Option.isSome(execution) && execution.value.exitCode === 0
    ? ({ status: "updated" } satisfies UpdateResult)
    : ({ status: "failed" } satisfies UpdateResult);
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
