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

export function registerCommands(pi: ExtensionAPI): void {
  for (const name of OPERATOR_COMMAND_NAMES) {
    pi.registerCommand(name, {
      description: commands[name].description,
      handler: async (_arguments, context) => {
        await context.waitForIdle();
        const arguments_ = commands[name].operation;
        const result = await pi.exec("operator-helper", [...arguments_], { cwd: context.cwd });
        const prompt =
          result.code === 127
            ? unavailablePrompt(name, arguments_, result)
            : operationPrompt(name, arguments_, result);
        pi.sendUserMessage(prompt, { expandPromptTemplates: false });
      },
    });
  }
}

function operationPrompt(
  name: OperatorCommandName,
  arguments_: ReadonlyArray<string>,
  result: HelperResult,
): string {
  return [
    wrapCommand(arguments_, result),
    "",
    "<operator-instructions>",
    commands[name].instructions,
    "</operator-instructions>",
  ].join("\n");
}

function unavailablePrompt(
  name: OperatorCommandName,
  arguments_: ReadonlyArray<string>,
  result: HelperResult,
): string {
  return [
    wrapCommand(arguments_, result),
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
