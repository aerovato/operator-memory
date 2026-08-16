import { Context, Data, Effect, Layer, Option, Path, PlatformError, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { readOptionalText, writeText } from "./filesystem.ts";
import { getErrorMessage } from "./utils.ts";

const IGNORE_BLOCK = "# Operator: Ignore private partition\n.operator/\n";

export class GitError extends Data.TaggedError("GitError")<{
  readonly message: string;
}> {}

export namespace GitRunner {
  export interface Interface {
    readonly run: (
      arguments_: ReadonlyArray<string>,
      cwd: string,
    ) => Effect.Effect<string, GitError>;
  }

  export class Service extends Context.Service<Service, Interface>()(
    "@aerovato/operator-helper/GitRunner",
  ) {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      return Service.of({
        run: Effect.fn("GitRunner.run")((arguments_: ReadonlyArray<string>, cwd: string) =>
          Effect.scoped(
            Effect.gen(function* () {
              const handle = yield* spawner.spawn(ChildProcess.make("git", arguments_, { cwd }));
              const [stdout, stderr, exitCode] = yield* Effect.all(
                [
                  handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
                  handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
                  handle.exitCode,
                ] as const,
                { concurrency: "unbounded" },
              );
              if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
                return yield* new GitError({
                  message: stderr.trim() || `git exited with code ${exitCode}`,
                });
              }
              return stdout;
            }),
          ).pipe(
            Effect.mapError(error =>
              error instanceof GitError
                ? error
                : new GitError({
                    message:
                      error instanceof PlatformError.PlatformError
                        ? (error.reason.description ?? error.message)
                        : getErrorMessage(error),
                  }),
            ),
          ),
        ),
      });
    }),
  );
}

const resolveGlobalIgnore = Effect.fn("resolveGlobalIgnore")(function* (
  home: string,
  xdgConfigHome: string | null,
) {
  const git = yield* GitRunner.Service;
  const pathService = yield* Path.Path;
  const configured = yield* git
    .run(["config", "--path", "--global", "--get", "core.excludesFile"], home)
    .pipe(Effect.option);
  const configuredPath = Option.isSome(configured) ? configured.value.trim() : "";
  return configuredPath !== ""
    ? configuredPath
    : pathService.join(xdgConfigHome ?? pathService.join(home, ".config"), "git", "ignore");
});

export const checkGlobalIgnore = Effect.fn("checkGlobalIgnore")(function* (
  home: string,
  xdgConfigHome: string | null,
) {
  const path = yield* resolveGlobalIgnore(home, xdgConfigHome);
  const content = yield* readOptionalText(path);
  return content?.split(/\r?\n/).includes(".operator/") ?? false;
});

export const ensureGlobalIgnore = Effect.fn("ensureGlobalIgnore")(function* (
  home: string,
  xdgConfigHome: string | null,
) {
  const path = yield* resolveGlobalIgnore(home, xdgConfigHome);
  const content = yield* readOptionalText(path);
  if (content?.split(/\r?\n/).includes(".operator/")) {
    return "present";
  }

  const existing = content ?? "";
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  yield* writeText(path, `${existing}${separator}${IGNORE_BLOCK}`);
  return "configured";
});

export const hasTrackedPrivateFiles = Effect.fn("hasTrackedPrivateFiles")(function* (cwd: string) {
  const git = yield* GitRunner.Service;
  const tracked = yield* git.run(["ls-files", "--", ".operator"], cwd);
  return tracked.trim() !== "";
});
