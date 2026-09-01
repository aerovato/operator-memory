import { spawn } from "node:child_process";

import type { Context } from "@opencode-ai/plugin/promise/plugin";

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
    operations: [
      ["user", "init"],
      ["user", "guide"],
    ],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:project-init": {
    description: "Initialize Operator Project",
    operations: [
      ["project", "init"],
      ["project", "guide"],
    ],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:index": {
    description: "Build or refresh the Operator Project Index",
    operations: [
      ["index", "status"],
      ["index", "guide"],
    ],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator:repair": {
    description: "Repair Operator",
    operations: [["memory", "check"]],
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
  const version = await runHelper(["version"], cwd);
  if (version.exitCode !== 0) {
    return [
      wrapCommand(["version"], version.output),
      "",
      "<operator-diagnostic>",
      `Operator Helper is unavailable. Help the user repair the missing operator-helper command (npm: @aerovato/operator-helper). Validate the repair by rerunning \`operator-helper version\`. Once it succeeds, ask the user to rerun \`/${name}\`.`,
      "</operator-diagnostic>",
    ].join("\n");
  }

  const outputs: string[] = [];
  for (const arguments_ of commands[name].operations) {
    outputs.push(wrapCommand(arguments_, (await runHelper(arguments_, cwd)).output));
  }
  return [
    ...outputs.flatMap((output, index) => (index === 0 ? [output] : ["", output])),
    "",
    "<operator-instructions>",
    commands[name].instructions,
    "</operator-instructions>",
  ].join("\n");
}

function runHelper(
  arguments_: ReadonlyArray<string>,
  cwd: string,
): Promise<{ exitCode: number; output: string }> {
  return new Promise(resolve => {
    const child = spawn(`operator-helper ${arguments_.join(" ")} 2>&1`, {
      cwd,
      shell: true,
      windowsHide: true,
    });
    const output: Buffer[] = [];
    child.stdout.on("data", chunk => output.push(Buffer.from(chunk)));
    child.on("error", error => resolve({ exitCode: 1, output: error.message }));
    child.on("close", code =>
      resolve({ exitCode: code ?? 1, output: Buffer.concat(output).toString().trim() }),
    );
  });
}

function wrapCommand(arguments_: ReadonlyArray<string>, output: string): string {
  return [
    "<operator-command>",
    `<command>operator-helper ${arguments_.join(" ")} 2>&1</command>`,
    "<output>",
    output,
    "</output>",
    "</operator-command>",
  ].join("\n");
}
