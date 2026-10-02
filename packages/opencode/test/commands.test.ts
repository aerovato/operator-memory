import type { Config } from "@opencode-ai/plugin";
import { expect, test } from "vitest";

import { OPERATOR_COMMAND_NAMES, registerCommands } from "../src/commands.ts";

test("registers commands without replacing user definitions", () => {
  const config = {
    command: { "operator:index": { description: "Custom", template: "Custom index" } },
  } as Config;
  registerCommands(config);

  expect(config.command?.["operator:index"]?.template).toBe("Custom index");
  expect(Object.keys(config.command ?? {}).sort()).toEqual([...OPERATOR_COMMAND_NAMES].sort());
});

test.each([
  ["operator:user-init", "user init", "User Setup"],
  ["operator:project-init", "project init", "Project Setup"],
  ["operator:index", "index init", "Project Index Setup"],
  ["operator:repair", "memory check", "reported load failures"],
] as const)("hands %s to the agent without running Helper", (name, operation, guide) => {
  const config = {} as Config;
  registerCommands(config);
  const template = config.command?.[name]?.template ?? "";

  expect(template).toContain("1. Run `operator-helper version`");
  expect(template).toContain("run `operator-helper upgrade` before continuing");
  expect(template).toContain(`2. Run \`operator-helper ${operation}\``);
  expect(template).toContain(guide);
  expect(template).toContain("npm package `@aerovato/operator-helper` globally");
  expect(template).not.toContain("!`");
  expect(template).not.toContain("<operator-command>");
});
