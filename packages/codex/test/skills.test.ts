import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const skills = [
  {
    command: "operator-helper user init",
    directory: "operator-user-init",
    name: "operator-user-init",
  },
  {
    command: "operator-helper project init",
    directory: "operator-project-init",
    name: "operator-project-init",
  },
] as const;

test("ships only the setup skills", async () => {
  const directories = await readdir(resolve(import.meta.dirname, "../skills"), {
    withFileTypes: true,
  });
  expect(
    directories
      .filter(directory => directory.isDirectory())
      .map(directory => directory.name)
      .sort(),
  ).toEqual(skills.map(skill => skill.directory).sort());
});

test.each(skills)(
  "registers $name for explicit invocation",
  async ({ command, directory, name }) => {
    const skillDirectory = resolve(import.meta.dirname, "../skills", directory);
    const [instructions, metadata] = await Promise.all([
      readFile(resolve(skillDirectory, "SKILL.md"), "utf8"),
      readFile(resolve(skillDirectory, "agents/openai.yaml"), "utf8"),
    ]);

    expect(instructions).toContain(`name: ${name}`);
    expect(directory).toBe(name);
    expect(instructions).toContain("1. Run `operator-helper version`");
    expect(instructions).toContain("run `operator-helper upgrade` before continuing");
    expect(instructions).toContain(command);
    expect(instructions).toContain("npm package `@aerovato/operator-helper` globally");
    expect(instructions).not.toContain("ask them to invoke");
    expect(instructions).not.toContain("operator-helper index status");
    expect(instructions).not.toContain("operator-helper user guide");
    expect(instructions).not.toContain("operator-helper project guide");
    expect(instructions).not.toContain("operator-helper index guide");
    expect(instructions).not.toContain("<operator-command>");
    expect(metadata).toContain("allow_implicit_invocation: false");
  },
);
