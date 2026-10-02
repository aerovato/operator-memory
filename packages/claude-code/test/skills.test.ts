import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const skills = [
  { name: "user-init", command: "user init" },
  { name: "project-init", command: "project init" },
  { name: "index", command: "index init" },
  { name: "repair", command: "memory check" },
] as const;

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
