import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, type FileSystem, Layer, type Path, Result } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import {
  ensureDirectory,
  type FileError,
  inspectPath,
  listFiles,
  readOptionalText,
  readText,
  writeText,
  writeTextIfMissing,
  PathKindError,
} from "../src/filesystem.ts";
import { SystemError } from "effect/PlatformError";

const services = Layer.merge(NodeFileSystem.layer, NodePath.layer);

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "operator-helper-filesystem-"));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

test("inspects missing, file, directory, and other paths", async () => {
  const root = path("root");
  const file = path("root/file.txt");
  mkdirSync(root);
  writeFileSync(file, "content");
  symlinkSync(file, path("file-link.txt"));
  symlinkSync(root, path("directory-link"));

  expect(await run(inspectPath(path("missing")))).toBe("missing");
  expect(await run(inspectPath(file))).toBe("file");
  expect(await run(inspectPath(root))).toBe("directory");
  expect(await run(inspectPath(path("file-link.txt")))).toBe("other");
  expect(await run(inspectPath(path("directory-link")))).toBe("other");
});

test("reads required and optional text", async () => {
  const root = path("root");
  const file = path("root/file.txt");
  mkdirSync(root);
  writeFileSync(file, "content");

  expect(await run(readText(file))).toBe("content");
  expect(await run(readOptionalText(path("missing.txt")))).toBeNull();
  const obstructed = await run(Effect.result(readOptionalText(root)));
  expect(Result.isFailure(obstructed)).toBe(true);
  if (Result.isFailure(obstructed)) {
    expect(obstructed.failure).toEqual(
      new PathKindError({ path: root, expected: "file", actual: "directory" }),
    );
  }

  const missingPath = path("missing.txt");
  const missing = await run(Effect.result(readText(missingPath)));
  expect(Result.isFailure(missing)).toBe(true);
  if (Result.isFailure(missing)) {
    expect(errorPath(missing.failure)).toBe(missingPath);
  }
});

test("creates parent directories and writes text", async () => {
  const nested = path("root/nested");
  const file = path("root/nested/file.txt");
  expect(await run(ensureDirectory(nested))).toBeUndefined();
  expect(await run(writeText(file, "first"))).toBeUndefined();
  expect(await run(writeText(file, "second"))).toBeUndefined();
  expect(readFileSync(file, "utf8")).toBe("second");
});

test("writes only missing files", async () => {
  const file = path("root/file.txt");
  expect(await run(writeTextIfMissing(file, "first"))).toBe("created");
  expect(await run(writeTextIfMissing(file, "second"))).toBe("preserved");
  expect(readFileSync(file, "utf8")).toBe("first");

  const obstruction = path("root/directory");
  mkdirSync(obstruction);
  const obstructed = await run(Effect.result(writeTextIfMissing(obstruction, "content")));
  expect(Result.isFailure(obstructed)).toBe(true);
  if (Result.isFailure(obstructed)) {
    expect(obstructed.failure).toEqual(
      new PathKindError({ path: obstruction, expected: "file", actual: "directory" }),
    );
  }
});

test("recursively lists regular files in relative-path order", async () => {
  const root = path("root");
  mkdirSync(path("root/nested"), { recursive: true });
  writeFileSync(path("root/z.txt"), "z");
  writeFileSync(path("root/nested/b.txt"), "b");
  writeFileSync(path("root/a.txt"), "a");
  symlinkSync(root, path("root/cycle"));

  const result = await run(listFiles(root));
  expect(result.map(file => file.relativePath)).toEqual(["a.txt", "nested/b.txt", "z.txt"]);
  expect(await run(listFiles(path("missing")))).toEqual([]);
});

test("rejects a file as a listing root", async () => {
  const file = path("root.txt");
  writeFileSync(file, "content");
  const result = await run(Effect.result(listFiles(file)));
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(result.failure).toEqual(
      new PathKindError({ path: file, expected: "directory", actual: "file" }),
    );
  }
});

function path(relativePath: string): string {
  return join(directory, relativePath);
}

function run<A, E>(effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(services)));
}

function errorPath(error: FileError): string | number | undefined {
  return error instanceof PathKindError
    ? error.path
    : error.reason instanceof SystemError
      ? error.reason.pathOrDescriptor
      : undefined;
}
