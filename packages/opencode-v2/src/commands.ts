import type { Context } from "@opencode/plugin/promise/plugin";

export const OPERATOR_COMMAND_NAMES = [
  "operator:user-init",
  "operator:project-init",
  "operator:index",
  "operator:repair",
] as const;

const commands = {
  "operator:user-init": {
    description: "Initialize Operator User Instructions",
    operation: "user init",
    guide:
      "Follow the User Setup guide in its output, including when initialization reports failures.",
  },
  "operator:project-init": {
    description: "Initialize Operator Project",
    operation: "project init",
    guide:
      "Follow the Project Setup guide in its output, including when initialization reports failures.",
  },
  "operator:index": {
    description: "Build or refresh the Operator Project Index",
    operation: "index init",
    guide:
      "Follow the Project Index Setup guide in its output, including when inspection reports failures.",
  },
  "operator:repair": {
    description: "Repair Operator",
    operation: "memory check",
    guide:
      "If no issues are detected, stop. Otherwise, repair only the reported load failures without initializing absent partitions. Rerun `operator-helper memory check` to confirm the repair, then read the applicable Operator memory documents.",
  },
} as const;

export async function registerCommands(context: Context): Promise<void> {
  const existing = new Set((await context.command.list()).data.map(command => command.name));
  await context.command.transform(draft => {
    for (const name of OPERATOR_COMMAND_NAMES) {
      if (existing.has(name)) continue;
      const command = commands[name];
      draft.add({
        name,
        description: command.description,
        execute: async input => {
          await context.session.prompt({
            ...input.prompt,
            sessionID: input.sessionID,
            text: `# ${command.description}

1. Run \`operator-helper version\`. If an update is available, run \`operator-helper upgrade\` before continuing.
2. Run \`operator-helper ${command.operation}\`. ${command.guide}

## Recovery

- If Helper cannot start, repair its installation and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If \`operator-helper ${command.operation}\` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.`,
            delivery: input.delivery,
          });
        },
      });
    }
  });
}
