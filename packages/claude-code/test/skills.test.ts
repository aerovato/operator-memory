import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const skills = [
  { name: "user-init", command: "user init" },
  { name: "project-init", command: "project init" },
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
  ).toEqual(skills.map(skill => skill.name).sort());
});

test.each(skills)(
  "registers /operator:$name for explicit invocation",
  async ({ name, command }) => {
    const instructions = await readFile(
      resolve(import.meta.dirname, `../skills/${name}/SKILL.md`),
      "utf8",
    );

    expect(instructions).toContain(`name: ${name}\n`);
    expect(instructions).toContain("disable-model-invocation: true");
    expect(instructions).not.toContain("allowed-tools:");
    expect(instructions).toContain("1. Run `operator-helper version`");
    expect(instructions).toContain("run `operator-helper upgrade` before continuing");
    expect(instructions).toContain(`2. Run \`operator-helper ${command}\``);
    expect(instructions).toContain("npm package `@aerovato/operator-helper` globally");
    expect(instructions).not.toContain("$operator-");
    expect(instructions).not.toContain("!`");
  },
);
