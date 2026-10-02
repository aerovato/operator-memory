import { execFile } from "node:child_process";

import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-commands";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

export const OPERATOR_COMMAND_NAMES = [
  "operator-user-init",
  "operator-project-init",
  "operator-index",
  "operator-repair",
] as const;

type OperatorCommandName = (typeof OPERATOR_COMMAND_NAMES)[number];
type HelperResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
  readonly unavailable: boolean;
};

const commands = {
  "operator-user-init": {
    description: "Initialize Operator User Instructions",
    operation: ["user", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator-project-init": {
    description: "Initialize Operator Project",
    operation: ["project", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator-index": {
    description: "Build or refresh the Operator Project Index",
    operation: ["index", "init"],
    instructions: "Follow the instructions in the guide output above.",
  },
  "operator-repair": {
    description: "Repair Operator",
    operation: ["memory", "check"],
    instructions:
      "If the output says `No issues detected.`, no action is needed and you may stop. Otherwise, repair only the reported Operator memory issues; do not initialize uninitialized partitions. Rerun `operator-helper memory check` until it succeeds, then read the applicable Operator memory before continuing.",
  },
} as const;

export function registerCommands(context: Context): void {
  for (const name of OPERATOR_COMMAND_NAMES) {
    context.commands.register({
      name,
      description: commands[name].description,
      handler: async ({ agent, signal }) => {
        const cwd = agent.session.header.cwd ?? process.cwd();
        const text = await commandPrompt(name, cwd, signal);
        signal.throwIfAborted();
        agent.followup(
          createUserMessage({
            content: [{ type: "text", text }],
            source: { kind: "user" },
          }),
        );
        return { kind: "success" };
      },
    });
  }
}

async function commandPrompt(
  name: OperatorCommandName,
  cwd: string,
  signal: AbortSignal,
): Promise<string> {
  const arguments_ = commands[name].operation;
  const result = await runHelper(arguments_, cwd, signal);
  if (result.unavailable) return unavailablePrompt(name, arguments_, result);
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
  arguments_: readonly string[],
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

function wrapCommand(arguments_: readonly string[], result: HelperResult): string {
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

function runHelper(
  arguments_: readonly string[],
  cwd: string,
  signal: AbortSignal,
): Promise<HelperResult> {
  return new Promise((resolve, reject) => {
    execFile(
      "operator-helper",
      [...arguments_],
      { cwd, encoding: "utf8", signal, shell: process.platform === "win32", windowsHide: true },
      (error, stdout, stderr) => {
        if (signal.aborted) {
          reject(error ?? signal.reason);
          return;
        }
        resolve({
          stdout,
          stderr: stderr || error?.message || "",
          code: error === null ? 0 : typeof error.code === "number" ? error.code : 1,
          unavailable:
            error?.code === "ENOENT"
            || error?.code === "EACCES"
            || (process.platform === "win32" && error?.code === 9009),
        });
      },
    );
  });
}
