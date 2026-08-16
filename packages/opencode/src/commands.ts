import type { Config } from "@opencode-ai/plugin";

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
    template: commandTemplate(
      "operator:user-init",
      ["operator-helper user init 2>&1", "operator-helper user guide 2>&1"],
      "Follow the instructions in the guide output above.",
    ),
  },
  "operator:project-init": {
    description: "Initialize Operator Project",
    template: commandTemplate(
      "operator:project-init",
      ["operator-helper project init 2>&1", "operator-helper project guide 2>&1"],
      "Follow the instructions in the guide output above.",
    ),
  },
  "operator:index": {
    description: "Build or refresh the Operator Project Index",
    template: commandTemplate(
      "operator:index",
      ["operator-helper index status 2>&1", "operator-helper index guide 2>&1"],
      "Follow the instructions in the guide output above.",
    ),
  },
  "operator:repair": {
    description: "Repair Operator",
    template: commandTemplate(
      "operator:repair",
      ["operator-helper memory check 2>&1"],
      "If the output says `No issues detected.`, no action is needed and you may stop. Otherwise, repair only the reported Operator memory issues; do not initialize uninitialized partitions. Rerun `operator-helper memory check` until it succeeds, then read the applicable Operator memory before continuing.",
    ),
  },
} satisfies NonNullable<Config["command"]>;

export function registerCommands(config: Config): void {
  config.command ??= {};
  for (const name of OPERATOR_COMMAND_NAMES) {
    config.command[name] ??= commands[name];
  }
}

function commandTemplate(
  name: OperatorCommandName,
  commandLines: ReadonlyArray<string>,
  instructions: string | null,
): string {
  const successOutput = commandLines.map(commandOutput).join(`\n${printLine("")}\n`);
  const instructionsOutput =
    instructions === null
      ? ""
      : `\n${printLine("")}\n${printLine("<operator-instructions>")}\n${printLine(instructions)}\n${printLine("</operator-instructions>")}`;
  const diagnostic = `Operator Helper is unavailable. Help the user repair the missing operator-helper command (npm: @aerovato/operator-helper). Validate the repair by rerunning \`operator-helper version\`. Once it succeeds, ask the user to rerun \`/${name}\`.`;

  return `!\`operator_helper_version_output="$(operator-helper version 2>&1)"
operator_helper_version_status=$?
if [ "$operator_helper_version_status" -eq 0 ]; then
${successOutput}${instructionsOutput}
else
${printLine("<operator-command>")}
${printLine("<command>operator-helper version 2>&1</command>")}
${printLine("<output>")}
printf '%s\\n' "$operator_helper_version_output"
${printLine("</output>")}
${printLine("</operator-command>")}
${printLine("")}
${printLine("<operator-diagnostic>")}
${printLine(diagnostic)}
${printLine("</operator-diagnostic>")}
fi\``;
}

function commandOutput(commandLine: string): string {
  return `operator_command_output="$(${commandLine})"
${printLine("<operator-command>")}
${printLine(`<command>${commandLine}</command>`)}
${printLine("<output>")}
printf '%s\\n' "$operator_command_output"
${printLine("</output>")}
${printLine("</operator-command>")}`;
}

function printLine(value: string): string {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll("`", "\\140").replaceAll("'", "'\\''");
  return `printf '%b\\n' '${escaped}'`;
}
