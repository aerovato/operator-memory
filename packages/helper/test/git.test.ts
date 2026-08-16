import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, FileSystem, Layer, type Path, Result } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import {
  checkGlobalIgnore,
  ensureGlobalIgnore,
  GitError,
  type GitRunner,
  hasTrackedPrivateFiles,
} from "../src/git.ts";
import { makeGitRunnerLayer } from "./mocks/git-runner.ts";

let directory: string;
let configuredIgnore: string | null;
let tracked: string;
let trackedError: string | null;

const gitLayer = makeGitRunnerLayer(arguments_ => {
  if (arguments_[0] === "config") {
    return configuredIgnore === null
      ? Effect.fail(new GitError({ message: "unset" }))
      : Effect.succeed(configuredIgnore);
  }
  return trackedError === null
    ? Effect.succeed(tracked)
    : Effect.fail(new GitError({ message: trackedError }));
});
const services = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, gitLayer);

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "operator-helper-git-"));
  configuredIgnore = null;
  tracked = "";
  trackedError = null;
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

test("checks the configured global ignore for an exact entry", async () => {
  const ignore = join(directory, "custom-ignore");
  writeFileSync(ignore, "other\r\n.operator/\r\n", "utf8");
  configuredIgnore = ` ${ignore}\n`;

  expect(await run(checkGlobalIgnore(directory, null))).toBe(true);

  writeFileSync(ignore, ".operator/private\n", "utf8");
  expect(await run(checkGlobalIgnore(directory, null))).toBe(false);
});

test("configures and preserves the fallback global ignore", async () => {
  const xdg = join(directory, "xdg");
  const ignore = join(xdg, "git", "ignore");
  await run(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      yield* fileSystem.makeDirectory(join(xdg, "git"), { recursive: true });
      yield* fileSystem.writeFileString(ignore, "node_modules/");
    }),
  );

  expect(await run(ensureGlobalIgnore(directory, xdg))).toBe("configured");
  expect(readFileSync(ignore, "utf8")).toBe(
    "node_modules/\n# Operator: Ignore private partition\n.operator/\n",
  );
  expect(await run(ensureGlobalIgnore(directory, xdg))).toBe("present");
  expect(readFileSync(ignore, "utf8").match(/\.operator\//g)).toHaveLength(1);
});

test("uses the default home configuration path", async () => {
  expect(await run(ensureGlobalIgnore(directory, null))).toBe("configured");
  expect(readFileSync(join(directory, ".config", "git", "ignore"), "utf8")).toBe(
    "# Operator: Ignore private partition\n.operator/\n",
  );
});

test("reports tracked private files and Git failures", async () => {
  tracked = ".operator/operator.md\n";
  expect(await run(hasTrackedPrivateFiles(directory))).toBe(true);

  tracked = "";
  expect(await run(hasTrackedPrivateFiles(directory))).toBe(false);

  trackedError = "fatal: not a repository";
  const failed = await run(Effect.result(hasTrackedPrivateFiles(directory)));
  expect(Result.isFailure(failed)).toBe(true);
  if (Result.isFailure(failed)) {
    expect(failed.failure.message).toBe("fatal: not a repository");
  }
});

function run<A, E>(
  effect: Effect.Effect<A, E, FileSystem.FileSystem | GitRunner.Service | Path.Path>,
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(services)));
}
