import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  expect(template).toContain('operator_command_output="$(operator-helper memory check 2>&1)"');
  expect(template).toContain("<command>operator-helper memory check 2>&1</command>");
  expect(template).toContain("<operator-instructions>");
  expect(template).toContain("\\140No issues detected.\\140");
  expect(template).toContain("do not initialize uninitialized partitions");
});

test("runs exactly one setup operation with explicit command output boundaries", () => {
  const config = {} as Config;
  registerCommands(config);

  expectSetupCommand(config, "operator:user-init", "user init");
  expectSetupCommand(config, "operator:project-init", "project init");
  expectSetupCommand(config, "operator:index", "index init");
});

test("distinguishes a missing Helper from non-zero setup and repair results", () => {
  const config = {} as Config;
  registerCommands(config);

  for (const name of OPERATOR_COMMAND_NAMES) {
    const template = config.command?.[name]?.template ?? "";
    const [missingBranch, operationBranch] = template.split("\nelse\n");

    expect(template.match(/!`/g)).toHaveLength(1);
    expect(template.match(/`/g)).toHaveLength(2);
    expect(template).not.toContain("operator-helper version 2>&1");
    expect(template).toContain('if [ "$operator_command_status" -eq 127 ]; then');
    expect(missingBranch).toContain("<operator-diagnostic>");
    expect(missingBranch).toContain(
      "Validate the repair by rerunning \\140operator-helper version\\140",
    );
    expect(missingBranch).toContain(`ask the user to rerun \\140/${name}\\140`);
    expect(operationBranch).toContain("<operator-instructions>");
  }
});

test.runIf(process.platform !== "win32")(
  "hands off a failed setup guide but diagnoses a missing Helper",
  () => {
    const config = {} as Config;
    registerCommands(config);
    const template = config.command?.["operator:user-init"]?.template ?? "";
    const script = template.slice(2, -1);
    const directory = mkdtempSync(join(tmpdir(), "operator-command-"));

    try {
      const helper = join(directory, "operator-helper");
      writeFileSync(
        helper,
        "#!/bin/sh\nprintf '%s\\n' 'Initialization failed' '# User Setup'\nexit 1\n",
      );
      chmodSync(helper, 0o755);
      const run = (path: string) =>
        spawnSync("/bin/sh", ["-c", script], {
          encoding: "utf8",
          env: { ...process.env, PATH: path },
        });

      const failed = run(directory);
      expect(failed.status).toBe(0);
      expect(failed.stdout).toContain("Initialization failed\n# User Setup");
      expect(failed.stdout).toContain("<operator-instructions>");
      expect(failed.stdout).not.toContain("<operator-diagnostic>");

      const missing = run(join(directory, "missing"));
      expect(missing.status).toBe(0);
      expect(missing.stdout).toContain("<operator-diagnostic>");
      expect(missing.stdout).not.toContain("<operator-instructions>");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

function expectSetupCommand(config: Config, name: string, operation: string): void {
  const template = config.command?.[name]?.template ?? "";
  const operationCommand = `operator-helper ${operation} 2>&1`;

  expect(template).toContain(`operator_command_output="$(${operationCommand})"`);
  expect(template).toContain(`<command>${operationCommand}</command>`);
  expect(template).not.toContain("operator-helper user guide");
  expect(template).not.toContain("operator-helper project guide");
  expect(template).not.toContain("operator-helper index status");
  expect(template).not.toContain("operator-helper index guide");
}
