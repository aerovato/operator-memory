import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-commands";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

export const OPERATOR_COMMAND_NAMES = [
  "operator-user-init",
  "operator-project-init",
  "operator-index",
  "operator-repair",
] as const;

const commands = {
  "operator-user-init": {
    description: "Initialize Operator User Instructions",
    operation: "user init",
    guide:
      "Follow the User Setup guide in its output, including when initialization reports failures.",
  },
  "operator-project-init": {
    description: "Initialize Operator Project",
    operation: "project init",
    guide:
      "Follow the Project Setup guide in its output, including when initialization reports failures.",
  },
  "operator-index": {
    description: "Build or refresh the Operator Project Index",
    operation: "index init",
    guide:
      "Follow the Project Index Setup guide in its output, including when inspection reports failures.",
  },
  "operator-repair": {
    description: "Repair Operator",
    operation: "memory check",
    guide:
      "If no issues are detected, stop. Otherwise, repair only the reported load failures without initializing absent partitions. Rerun `operator-helper memory check` to confirm the repair, then read the applicable Operator memory documents.",
  },
} as const;

export function registerCommands(context: Context): void {
  for (const name of OPERATOR_COMMAND_NAMES) {
    const command = commands[name];
    context.commands.register({
      name,
      description: command.description,
      handler: async ({ agent, signal }) => {
        signal.throwIfAborted();
        agent.followup(
          createUserMessage({
            content: [
              {
                type: "text",
                text: `# ${command.description}

1. Run \`operator-helper version\`. If an update is available, run \`operator-helper upgrade\` before continuing.
2. Run \`operator-helper ${command.operation}\`. ${command.guide}

## Recovery

- If Helper cannot start, install or repair the npm package \`@aerovato/operator-helper\` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If \`operator-helper ${command.operation}\` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.`,
              },
            ],
            source: { kind: "user" },
          }),
        );
        return { kind: "success" };
      },
    });
  }
}
