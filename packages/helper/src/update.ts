import { mkdir, readFile, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, join, sep } from "node:path";

import { Effect, Option, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { NpmRegistry } from "./npm-registry.ts";
import type { CliContext } from "./utils.ts";

const HELPER_PACKAGE = "@aerovato/operator-helper";
const UPDATE_TIMEOUT = "60 seconds";
const SUCCESS_COOLDOWN = 60 * 60 * 1_000;
const FAILURE_COOLDOWN = 5 * 60 * 1_000;

const UpdateCheck = Schema.Union([
  Schema.Struct({ checkedAt: Schema.Number, status: Schema.Literal("current") }),
  Schema.Struct({ checkedAt: Schema.Number, status: Schema.Literal("failed") }),
  Schema.Struct({
    checkedAt: Schema.Number,
    status: Schema.Literal("unknown"),
    latest: Schema.String,
  }),
]);
type UpdateCheck = typeof UpdateCheck.Type;
const decodeUpdateCheck = Schema.decodeUnknownSync(Schema.fromJsonString(UpdateCheck));

type InstallationChannel = "bun" | "npm" | "unknown";

export type UpdateResult =
  | { readonly status: "current" }
  | { readonly status: "updated" }
  | { readonly status: "unknown"; readonly latest: string }
  | { readonly status: "failed" };

function updateCheckPath(context: CliContext): string {
  const cache = process.env.XDG_CACHE_HOME || join(context.home, ".cache");
  return join(cache, "operator", "helper-update.json");
}

export const autoUpdate = Effect.fn("autoUpdate")(function* (
  currentVersion: string,
  context: CliContext,
) {
  const cached = yield* Effect.promise(() => readUpdateCheck(context));
  if (cached !== null && isFresh(cached)) {
    if (cached.status === "unknown") {
      return { status: "unknown", latest: cached.latest } satisfies UpdateResult;
    }
    return { status: cached.status } satisfies UpdateResult;
  }

  const registry = yield* NpmRegistry.Service;
  const latest = yield* registry.latestVersion(HELPER_PACKAGE).pipe(Effect.option);
  if (Option.isNone(latest)) {
    yield* Effect.promise(() =>
      writeUpdateCheck(context, { checkedAt: Date.now(), status: "failed" }),
    );
    return { status: "failed" } satisfies UpdateResult;
  }
  if (!isNewerVersion(currentVersion, latest.value)) {
    yield* Effect.promise(() =>
      writeUpdateCheck(context, { checkedAt: Date.now(), status: "current" }),
    );
    return { status: "current" } satisfies UpdateResult;
  }

  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const channel = yield* detectInstallationChannel(
    spawner,
    context.cwd,
    process.argv[1] ?? process.execPath,
  );
  if (channel === "unknown") {
    yield* Effect.promise(() =>
      writeUpdateCheck(context, {
        checkedAt: Date.now(),
        status: "unknown",
        latest: latest.value,
      }),
    );
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
  if (Option.isSome(execution) && execution.value.exitCode === 0) {
    yield* Effect.promise(() =>
      writeUpdateCheck(context, { checkedAt: Date.now(), status: "current" }),
    );
    return { status: "updated" } satisfies UpdateResult;
  }
  yield* Effect.promise(() =>
    writeUpdateCheck(context, { checkedAt: Date.now(), status: "failed" }),
  );
  return { status: "failed" } satisfies UpdateResult;
});

function isFresh(check: UpdateCheck): boolean {
  const age = Date.now() - check.checkedAt;
  const cooldown = check.status === "current" ? SUCCESS_COOLDOWN : FAILURE_COOLDOWN;
  return age >= 0 && age < cooldown;
}

async function readUpdateCheck(context: CliContext): Promise<UpdateCheck | null> {
  try {
    return decodeUpdateCheck(await readFile(updateCheckPath(context), "utf8"));
  } catch {
    return null;
  }
}

async function writeUpdateCheck(context: CliContext, check: UpdateCheck): Promise<void> {
  const path = updateCheckPath(context);
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, JSON.stringify(check), { mode: 0o600 });
  } catch {
    // Update checks remain uncached when the cache is not writable.
  }
}

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
