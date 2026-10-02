import { spawn } from "node:child_process";

import type { Context } from "@opencode/plugin/promise/plugin";

export const OPERATOR_COMMAND_NAMES = [
  "operator:user-init",
  "operator:project-init",
  "operator:index",
  "operator:repair",
] as const;

type OperatorCommandName = (typeof OPERATOR_COMMAND_NAMES)[number];

const commands = {
  "operator:user-init": {
    description: "Initialize Operator User Instructions",
    operation: ["user", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:project-init": {
    description: "Initialize Operator Project",
    operation: ["project", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:index": {
    description: "Build or refresh the Operator Project Index",
    operation: ["index", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:repair": {
    description: "Repair Operator",
    operation: ["memory", "check"],
    instructions:
      "If the output says `No issues detected.`, no action is needed and you may stop. Otherwise, repair only the reported Operator memory issues; do not initialize uninitialized partitions. Rerun `operator-helper memory check` until it succeeds, then read the applicable Operator memory before continuing.",
  },
} as const;

export async function registerCommands(context: Context): Promise<void> {
  const existing = new Set((await context.command.list()).data.map(command => command.name));
  await context.command.transform(draft => {
    for (const name of OPERATOR_COMMAND_NAMES) {
      if (existing.has(name)) continue;
      draft.add({
        name,
        description: commands[name].description,
        execute: async input => {
          const text = await commandOutput(name, context.location.directory);
          await context.session.prompt({
            ...input.prompt,
            sessionID: input.sessionID,
            text,
            delivery: input.delivery,
          });
        },
      });
    }
  });
}

async function commandOutput(name: OperatorCommandName, cwd: string): Promise<string> {
  const arguments_ = commands[name].operation;
  const result = await runHelper(arguments_, cwd);
  if (result.unavailable) {
    return [
      wrapCommand(arguments_, result.output),
      "",
      "<operator-diagnostic>",
      `Operator Helper is unavailable. Help the user repair the missing operator-helper command (npm: @aerovato/operator-helper). Validate the repair by rerunning \`operator-helper version\`. Once it succeeds, ask the user to rerun \`/${name}\`.`,
      "</operator-diagnostic>",
    ].join("\n");
  }
  return [
    wrapCommand(arguments_, result.output),
    "",
    "<operator-instructions>",
    commands[name].instructions,
    "</operator-instructions>",
  ].join("\n");
}

function runHelper(
  arguments_: ReadonlyArray<string>,
  cwd: string,
): Promise<{ output: string; unavailable: boolean }> {
  return new Promise(resolve => {
    const child = spawn("operator-helper", [...arguments_], {
      cwd,
      shell: process.platform === "win32",
      windowsHide: true,
    });
    const output: Buffer[] = [];
    child.stdout.on("data", chunk => output.push(Buffer.from(chunk)));
    child.stderr.on("data", chunk => output.push(Buffer.from(chunk)));
    child.on("error", error => resolve({ output: error.message, unavailable: true }));
    child.on("close", code =>
      resolve({
        output: Buffer.concat(output).toString().trim(),
        unavailable: process.platform === "win32" && code === 9009,
      }),
    );
  });
}

function wrapCommand(arguments_: ReadonlyArray<string>, output: string): string {
  return [
    "<operator-command>",
    `<command>operator-helper ${arguments_.join(" ")}</command>`,
    "<output>",
    output,
    "</output>",
    "</operator-command>",
  ].join("\n");
}
