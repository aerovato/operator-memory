import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const OPERATOR_COMMAND_NAMES = [
  "operator:user-init",
  "operator:project-init",
  "operator:index",
  "operator:repair",
] as const;

type OperatorCommandName = (typeof OPERATOR_COMMAND_NAMES)[number];
type HelperResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;

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

export function registerCommands(pi: ExtensionAPI): void {
  for (const name of OPERATOR_COMMAND_NAMES) {
    pi.registerCommand(name, {
      description: commands[name].description,
      handler: async (_arguments, context) => {
        await context.waitForIdle();
        const version = await pi.exec("operator-helper", ["version"], { cwd: context.cwd });
        const prompt =
          version.code === 0
            ? await operationPrompt(pi, name, context.cwd)
            : unavailablePrompt(name, version);
        pi.sendUserMessage(prompt, { expandPromptTemplates: false });
      },
    });
  }
}

async function operationPrompt(
  pi: ExtensionAPI,
  name: OperatorCommandName,
  cwd: string,
): Promise<string> {
  const outputs: string[] = [];
  for (const arguments_ of commands[name].operations) {
    outputs.push(
      wrapCommand(arguments_, await pi.exec("operator-helper", [...arguments_], { cwd })),
    );
  }
  return [
    outputs.join("\n\n"),
    "",
    "<operator-instructions>",
    commands[name].instructions,
    "</operator-instructions>",
  ].join("\n");
}

function unavailablePrompt(name: OperatorCommandName, result: HelperResult): string {
  return [
    wrapCommand(["version"], result),
    "",
    "<operator-diagnostic>",
    `Operator Helper is unavailable. Help the user repair the missing operator-helper command (npm: @aerovato/operator-helper). Validate the repair by rerunning \`operator-helper version\`. Once it succeeds, ask the user to rerun \`/${name}\`.`,
    "</operator-diagnostic>",
  ].join("\n");
}

function wrapCommand(arguments_: ReadonlyArray<string>, result: HelperResult): string {
  return [
    "<operator-command>",
    `<command>operator-helper ${arguments_.join(" ")}</command>`,
    "<output>",
    "<stdout>",
    result.stdout.trim(),
    "</stdout>",
    "<stderr>",
    result.stderr.trim(),
    "</stderr>",
    `<code>${result.code}</code>`,
    "</output>",
    "</operator-command>",
  ].join("\n");
}
