import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, type FileSystem, Layer, type Path } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import { lintProjectIndexes } from "../src/lint.ts";

const services = Layer.merge(NodeFileSystem.layer, NodePath.layer);

let project: string;

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "operator-helper-lint-"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

test("returns no findings when index roots are absent", async () => {
  expect(await run(lintProjectIndexes(project))).toEqual([]);
});

test("enforces the Private title when only the Private main index exists", async () => {
  seed({
    ".operator/index/index.md": "---\ndescription: Main\nread_if: Always\n---\n# Project Index",
  });

  const result = await run(lintProjectIndexes(project));
  expect(result).toContainEqual({
    error: false,
    path: ".operator/index/index.md",
    message: 'Main index title should explicitly state "Private"',
  });
});

test("requires the literal partition name in each main title", async () => {
  seed({
    ".operator-shared/index/index.md":
      "---\ndescription: Main\nread_if: Always\n---\n# Public Project Index",
    ".operator/index/index.md":
      "---\ndescription: Main\nread_if: Always\n---\n# Personal Project Index",
  });

  const result = await run(lintProjectIndexes(project));
  expect(result.map(finding => finding.message)).toEqual([
    'Main index title should explicitly state "Shared"',
    'Main index title should explicitly state "Private"',
  ]);
});

test("checks nested metadata, Shared references, and non-Markdown files", async () => {
  seed({
    ".operator-shared/index/nested/api.md": "# API\n.operator/private.md",
    ".operator-shared/index/data.json": "{}",
  });

  const result = await run(lintProjectIndexes(project));
  expect(result.map(finding => finding.message)).toEqual([
    "Non-Markdown file in index tree",
    "Missing YAML frontmatter",
    "Shared index references private path (.operator/)",
  ]);
});

test("accepts valid partition-specific main titles", async () => {
  seed({
    ".operator-shared/index/index.md":
      "---\ndescription: Shared\nread_if: Always\n---\n# Shared Project Index",
    ".operator/index/index.md":
      "---\ndescription: Private\nread_if: Always\n---\n# Private Project Index",
  });

  expect(await run(lintProjectIndexes(project))).toEqual([]);
});

function seed(files: Readonly<Record<string, string>>): void {
  for (const [path, content] of Object.entries(files)) {
    const absolutePath = join(project, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }
}

function run<A, E>(effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(services)));
}
