import { lstat, readFile } from "node:fs/promises";

import { Effect, PlatformError, Result, Stream } from "effect";
import { SystemError } from "effect/PlatformError";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { type FileError, PathKindError } from "../filesystem.ts";
import { type CliResult, getErrorMessage } from "../utils.ts";

export type ProcessResult =
  | {
      readonly ok: true;
      readonly exitCode: number;
      readonly stdout: string;
      readonly stderr: string;
      readonly output: string;
    }
  | { readonly ok: false; readonly error: string };

export function fileFailure(error: FileError): CliResult {
  return { exitCode: 1, output: fileErrorMessage(error) };
}

export function fileErrorMessage(error: FileError): string {
  if (error instanceof PathKindError) {
    return `✗ ${error.path}: Expected a ${error.expected}, found ${error.actual}`;
  }
  const path = error.reason instanceof SystemError ? `${error.reason.pathOrDescriptor}: ` : "";
  return `✗ ${path}${error.reason.description ?? error.message}`;
}

export function runProcess(
  executable: string,
  arguments_: ReadonlyArray<string>,
  cwd: string,
  environment: Readonly<Record<string, string>> | null,
): Effect.Effect<ProcessResult, never, ChildProcessSpawner.ChildProcessSpawner> {
  return Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const command = ChildProcess.make(executable, [...arguments_], {
      cwd,
      env: environment ?? undefined,
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
        return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: Number(exitCode) };
      }),
    ).pipe(Effect.result);

    if (Result.isFailure(execution)) {
      const error =
        execution.failure instanceof PlatformError.PlatformError
          ? (execution.failure.reason.description ?? execution.failure.message)
          : getErrorMessage(execution.failure);
      return { ok: false, error } as const;
    }
    return {
      ok: true,
      ...execution.success,
      output: [execution.success.stdout, execution.success.stderr].filter(Boolean).join("\n"),
    } as const;
  });
}

export async function pathKind(path: string): Promise<"missing" | "file" | "directory" | "other"> {
  try {
    const info = await lstat(path);
    return info.isFile() ? "file" : info.isDirectory() ? "directory" : "other";
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return "missing";
    throw error;
  }
}

export async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
