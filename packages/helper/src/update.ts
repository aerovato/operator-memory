import { realpathSync } from "node:fs";
import { sep } from "node:path";

import { Effect, Option, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { NpmRegistry } from "./npm-registry.ts";
import type { CliContext } from "./utils.ts";

const HELPER_PACKAGE = "@aerovato/operator-helper";
const UPDATE_TIMEOUT = "60 seconds";

type InstallationChannel = "bun" | "npm" | "unknown";

export type UpdateResult =
  | { readonly status: "current" }
  | { readonly status: "updated"; readonly latest: string }
  | { readonly status: "unknown"; readonly latest: string }
  | { readonly status: "failed"; readonly message: string };

export const checkForUpdate = Effect.fn("checkForUpdate")(function* (currentVersion: string) {
  const registry = yield* NpmRegistry.Service;
  const latest = yield* registry.latestVersion(HELPER_PACKAGE);
  if (!isNewerVersion(currentVersion, latest)) return { status: "current" } as const;
  return { status: "available", latest } as const;
});

export const upgradeHelper = Effect.fn("upgradeHelper")(function* (context: CliContext) {
  const check = yield* checkForUpdate(context.version).pipe(
    Effect.catch(error => Effect.succeed({ status: "failed" as const, message: error.message })),
  );
  if (check.status === "failed") return check satisfies UpdateResult;
  if (check.status === "current") return check satisfies UpdateResult;

  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const channel = yield* detectInstallationChannel(
    spawner,
    context.cwd,
    process.argv[1] ?? process.execPath,
  );
  if (channel === "unknown") {
    return { status: "unknown", latest: check.latest } satisfies UpdateResult;
  }

  const command =
    channel === "bun"
      ? ChildProcess.make(
          "bun",
          ["add", "--global", "--minimum-release-age", "0", `${HELPER_PACKAGE}@${check.latest}`],
          { cwd: context.cwd },
        )
      : ChildProcess.make("npm", ["install", "--global", `${HELPER_PACKAGE}@${check.latest}`], {
          cwd: context.cwd,
          env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
          extendEnv: true,
        });
  const execution = yield* run(spawner, command).pipe(
    Effect.timeout(UPDATE_TIMEOUT),
    Effect.option,
  );
  if (Option.isSome(execution) && execution.value.exitCode === 0) {
    return { status: "updated", latest: check.latest } satisfies UpdateResult;
  }
  const detail = Option.isSome(execution)
    ? execution.value.stderr.trim()
      || execution.value.stdout.trim()
      || `exit code ${execution.value.exitCode}`
    : "process failed or timed out";
  return {
    status: "failed",
    message: `Operator Helper update failed: ${detail}.`,
  } satisfies UpdateResult;
});

export function detectInstallationChannel(
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  cwd: string,
  executablePath: string,
): Effect.Effect<InstallationChannel> {
  return Effect.gen(function* () {
    // Resolving the running executable's installation is deterministic even when
    // both Bun and npm global trees contain the package.
    const executable = realpathSync(executablePath);
    const [bunBin, npmPrefix] = yield* Effect.all(
      [
        globalDirectory(spawner, "bun", ["pm", "bin", "--global"], cwd),
        globalDirectory(spawner, "npm", ["prefix", "--global"], cwd),
      ] as const,
      { concurrency: "unbounded" },
    );
    if (bunBin !== null && executable.startsWith(`${bunBin}${sep}`)) return "bun";
    if (npmPrefix !== null && executable.startsWith(`${npmPrefix}${sep}`)) return "npm";

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

function globalDirectory(
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  executable: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<string | null> {
  return run(spawner, ChildProcess.make(executable, args, { cwd })).pipe(
    Effect.map(result =>
      result.exitCode === 0 && result.stdout.trim() !== "" ? result.stdout.trim() : null,
    ),
    Effect.orElseSucceed(() => null),
  );
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
