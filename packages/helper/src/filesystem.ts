import { Data, Effect, FileSystem, Path, type PlatformError } from "effect";

import { compareStrings } from "./utils.ts";

export class PathKindError extends Data.TaggedError("PathKindError")<{
  readonly path: string;
  readonly expected: "file" | "directory";
  readonly actual: PathKind;
}> {}

export type FileError = PlatformError.PlatformError | PathKindError;

export type PathKind = "missing" | "file" | "directory" | "other";

export type FileEntry = {
  readonly path: string;
  readonly relativePath: string;
};

export const inspectPath = Effect.fn("inspectPath")(function* (path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const isSymbolicLink = yield* fileSystem.readLink(path).pipe(
    Effect.as(true),
    Effect.catch(() => Effect.succeed(false)),
  );
  if (isSymbolicLink) {
    return "other";
  }
  const info = yield* fileSystem.stat(path).pipe(
    Effect.catchIf(
      error => error.reason._tag === "NotFound",
      () => Effect.succeed(null),
    ),
  );
  return info === null
    ? "missing"
    : info.type === "File"
      ? "file"
      : info.type === "Directory"
        ? "directory"
        : "other";
});

export const readText = Effect.fn("readText")(function* (path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.readFileString(path);
});

export const readOptionalText = Effect.fn("readOptionalText")(function* (path: string) {
  const kind = yield* inspectPath(path);
  if (kind === "missing") {
    return null;
  }
  return kind === "file"
    ? yield* readText(path)
    : yield* new PathKindError({ path, expected: "file", actual: kind });
});

export const ensureDirectory = Effect.fn("ensureDirectory")(function* (path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.makeDirectory(path, { recursive: true });
});

export const ensurePrivateDirectory = Effect.fn("ensurePrivateDirectory")(function* (path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const kind = yield* inspectPath(path);
  if (kind === "missing") {
    yield* fileSystem.makeDirectory(path, { recursive: true, mode: 0o700 });
  } else if (kind !== "directory") {
    return yield* new PathKindError({ path, expected: "directory", actual: kind });
  }
  yield* fileSystem.chmod(path, 0o700);
});

export const writeText = Effect.fn("writeText")(function* (path: string, content: string) {
  const pathService = yield* Path.Path;
  yield* ensureDirectory(pathService.dirname(path));
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.writeFileString(path, content);
});

export const writeTextIfMissing = Effect.fn("writeTextIfMissing")(function* (
  path: string,
  content: string,
) {
  const kind = yield* inspectPath(path);
  if (kind === "file") {
    return "preserved";
  }
  if (kind !== "missing") {
    return yield* new PathKindError({ path, expected: "file", actual: kind });
  }

  yield* writeText(path, content);
  return "created";
});

export const listFiles = Effect.fn("listFiles")(function* (root: string) {
  const kind = yield* inspectPath(root);
  if (kind === "missing") {
    return [];
  }
  if (kind !== "directory") {
    return yield* new PathKindError({ path: root, expected: "directory", actual: kind });
  }

  const files = yield* walkFiles(root, root);
  files.sort((left, right) => compareStrings(left.relativePath, right.relativePath));
  return files;
});

function walkFiles(
  root: string,
  directory: string,
): Effect.Effect<FileEntry[], FileError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;
    const directoryEntries = yield* fileSystem.readDirectory(directory);
    const files: FileEntry[] = [];
    for (const entry of directoryEntries) {
      const path = pathService.join(directory, entry);
      const kind = yield* inspectPath(path);
      if (kind === "directory") {
        files.push(...(yield* walkFiles(root, path)));
      } else if (kind === "file") {
        files.push({
          path,
          relativePath: pathService.relative(root, path).split(pathService.sep).join("/"),
        });
      }
    }
    return files;
  });
}
