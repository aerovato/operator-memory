import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, test } from "vitest";

import { loadPreamble } from "../src/preamble.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })),
  );
});

test("returns an immutable preamble for each session", async () => {
  const projectDirectory = await temporaryDirectory("operator-v2-project-");
  const homeDirectory = await temporaryDirectory("operator-v2-home-");
  const privateRoot = join(projectDirectory, ".operator");
  await mkdir(privateRoot);
  await writeFile(join(privateRoot, "operator.md"), "original instructions");

  const cache = new Map<string, ReturnType<typeof loadPreamble>>();
  const first = await loadPreamble({
    sessionID: "session-one",
    projectDirectory,
    homeDirectory,
    cache,
  });
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.value.content).toContain("original instructions");

  await writeFile(join(privateRoot, "operator.md"), "changed instructions");
  const repeated = await loadPreamble({
    sessionID: "session-one",
    projectDirectory,
    homeDirectory,
    cache,
  });
  expect(repeated).toEqual(first);

  const other = await loadPreamble({
    sessionID: "session-two",
    projectDirectory,
    homeDirectory,
    cache,
  });
  expect(other.ok).toBe(true);
  if (other.ok) expect(other.value.content).toContain("changed instructions");
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(path);
  return path;
}
