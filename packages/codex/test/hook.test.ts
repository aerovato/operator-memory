import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, expect, test } from "vitest";

const hookPath = resolve(import.meta.dirname, "../src/hook.ts");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })),
  );
});

test.each(["startup", "clear", "compact"])(
  "injects complete Helper output for SessionStart source %s",
  async source => {
    const projectDirectory = await temporaryDirectory("operator-codex-project-");
    const binDirectory = await helperBin(false);
    const output = runHook(
      { hook_event_name: "SessionStart", source, cwd: projectDirectory },
      binDirectory,
    );

    expect(output.status).toBe(0);
    expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
  },
);

test.each(["resume", "fork"])("skips SessionStart source %s", async source => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const output = runHook(
    { hook_event_name: "SessionStart", source, cwd: projectDirectory },
    binDirectory,
  );

  expect(output.status).toBe(0);
  expect(output.stdout).toBe("");
});

test("injects complete Helper output for delegated subagents", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const output = runHook({ hook_event_name: "SubagentStart", cwd: projectDirectory }, binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
});

test("returns a blocking user-visible failure when Helper fails", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(true);
  const output = runHook(
    { hook_event_name: "SessionStart", source: "startup", cwd: projectDirectory },
    binDirectory,
  );

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(
    JSON.stringify({
      continue: false,
      systemMessage: "Operator could not load memory because operator-helper preamble failed.",
    }),
  );
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function helperBin(fail: boolean): Promise<string> {
  const directory = await temporaryDirectory("operator-codex-bin-");
  const helperPath = join(directory, "operator-helper");
  await writeFile(
    helperPath,
    `#!/usr/bin/env node
if (${JSON.stringify(fail)}) process.exit(1);
process.stdout.write(JSON.stringify({ cwd: process.cwd(), arguments: process.argv.slice(2) }));
`,
  );
  await chmod(helperPath, 0o755);
  return directory;
}

function runHook(
  event: Readonly<Record<string, string>>,
  binDirectory: string,
): ReturnType<typeof spawnSync> {
  return spawnSync("bun", [hookPath], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${binDirectory}:${process.env.PATH ?? ""}` },
    input: JSON.stringify(event),
  });
}
