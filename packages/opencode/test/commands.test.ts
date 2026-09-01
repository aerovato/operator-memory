import type { Config } from "@opencode-ai/plugin";
import { expect, test } from "vitest";

import { OPERATOR_COMMAND_NAMES, registerCommands } from "../src/commands.ts";

test("registers inline setup commands without replacing user commands", () => {
  const config = {
    command: {
      custom: { description: "Custom", template: "Custom command" },
    },
  } as Config;

  registerCommands(config);

  expect(config.command?.custom?.template).toBe("Custom command");
  expect(Object.keys(config.command ?? {})).toEqual(["custom", ...OPERATOR_COMMAND_NAMES]);
  expect(config.command?.["operator:user-init"]?.description).toBe(
    "Initialize Operator User Instructions",
  );
  expect(config.command?.["operator:project-init"]?.description).toBe(
    "Initialize Operator Project",
  );
  expect(config.command?.["operator:index"]?.description).toBe(
    "Build or refresh the Operator Project Index",
  );
  expect(config.command?.["operator:repair"]?.description).toBe("Repair Operator");
});

test("preserves user commands with Operator names", () => {
  const config = {
    command: {
      "operator:index": { description: "Custom index", template: "Custom index command" },
    },
  } as Config;

  registerCommands(config);

  expect(config.command?.["operator:index"]?.template).toBe("Custom index command");
  expect(config.command?.["operator:user-init"]?.description).toBe(
    "Initialize Operator User Instructions",
  );
});

test("registers a focused memory repair command", () => {
  const config = {} as Config;
  registerCommands(config);

  const template = config.command?.["operator:repair"]?.template ?? "";
  const [successBranch, failureBranch] = template.split("\nelse\n");

  expect(successBranch).toContain('operator_command_output="$(operator-helper memory check 2>&1)"');
  expect(successBranch).toContain("<command>operator-helper memory check 2>&1</command>");
  expect(successBranch).toContain("<operator-instructions>");
  expect(successBranch).toContain("\\140No issues detected.\\140");
  expect(successBranch).toContain("do not initialize uninitialized partitions");
  expect(failureBranch).not.toContain("operator-helper memory check");
});

test("runs setup operations sequentially with explicit command output boundaries", () => {
  const config = {} as Config;
  registerCommands(config);

  expectSetupCommands(config, "operator:user-init", "user init", "user guide");
  expectSetupCommands(config, "operator:project-init", "project init", "project guide");
  expectSetupCommands(config, "operator:index", "index status", "index guide");
});

test("silently checks helper availability and renders only failed checks", () => {
  const config = {} as Config;
  registerCommands(config);

  for (const name of OPERATOR_COMMAND_NAMES) {
    const template = config.command?.[name]?.template ?? "";
    const [successBranch, failureBranch] = template.split("\nelse\n");

    expect(template.match(/!`/g)).toHaveLength(1);
    expect(template.match(/`/g)).toHaveLength(2);
    expect(template).toContain('operator_helper_version_output="$(operator-helper version 2>&1)"');
    expect(successBranch).not.toContain("<command>operator-helper version 2>&1</command>");
    expect(failureBranch).toContain("<command>operator-helper version 2>&1</command>");
    expect(failureBranch).toContain("<operator-diagnostic>");
    expect(failureBranch).toContain(
      "Validate the repair by rerunning \\140operator-helper version\\140",
    );
    expect(failureBranch).toContain(`ask the user to rerun \\140/${name}\\140`);
  }
});

function expectSetupCommands(config: Config, name: string, operation: string, guide: string): void {
  const template = config.command?.[name]?.template ?? "";
  const [successBranch, failureBranch] = template.split("\nelse\n");
  const operationCommand = `operator-helper ${operation} 2>&1`;
  const guideCommand = `operator-helper ${guide} 2>&1`;

  expect(successBranch).toContain(`operator_command_output="$(${operationCommand})"`);
  expect(successBranch).toContain(`<command>${operationCommand}</command>`);
  expect(successBranch).toContain(`operator_command_output="$(${guideCommand})"`);
  expect(successBranch).toContain(`<command>${guideCommand}</command>`);
  expect(successBranch).toContain("<operator-instructions>");
  expect(successBranch).toContain("Follow the instructions in the guide output above.");
  expect(successBranch?.indexOf(operationCommand)).toBeLessThan(
    successBranch?.indexOf(guideCommand) ?? -1,
  );
  expect(failureBranch).not.toContain(operationCommand);
  expect(failureBranch).not.toContain(guideCommand);
}
