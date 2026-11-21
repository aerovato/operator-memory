type KiroFile = {
  readonly path: string;
  readonly content: string;
};

const HOOK = `${JSON.stringify(
  {
    version: "v1",
    hooks: [
      {
        name: "Operator Memory preamble",
        trigger: "SessionStart",
        action: { type: "command", command: "operator-helper preamble" },
        timeout: 120,
        enabled: true,
      },
    ],
  },
  null,
  2,
)}\n`;

const STEERING = `---
inclusion: always
---

# Operator Memory

Operator Memory is installed for Kiro. If you do not see Operator's preamble guidance above wrapped within \`<operator-guidance>\`, manually run the \`operator-helper preamble\` command once from the workspace root and follow all instructions from the command output. If the command fails, report to the user and stop. Do not run if the preamble is already available.
`;

const RECOVERY = (command: string) => `## Recovery

- If Helper cannot start, install or repair the npm package \`@aerovato/operator-helper\` globally and retry the failed command.
- If the version check or upgrade fails, diagnose the error and retry.
- If \`operator-helper ${command}\` reports a failure, use its output to resolve it and rerun it as needed.
- If you cannot resolve a problem, report the blocker.

Use Helper output as working context. Do not reproduce it wholesale or reimplement Helper logic.
`;

const USER_INIT = `---
name: operator-user-init
description: Initialize and configure the Operator User Partition. Use only when the user invokes /operator-user-init.
---

# Operator User Setup

1. Run \`operator-helper version\`. If an update is available, run \`operator-helper upgrade\` before continuing.
2. Run \`operator-helper user init\` and follow the emitted User Setup guide, including when initialization reports failures.

${RECOVERY("user init")}`;

const PROJECT_INIT = `---
name: operator-project-init
description: Initialize and configure the Operator Project Brain. Use only when the user invokes /operator-project-init.
---

# Operator Project Setup

1. Run \`operator-helper version\`. If an update is available, run \`operator-helper upgrade\` before continuing.
2. Run \`operator-helper project init\` and follow the emitted Project Setup guide, including when initialization reports failures.

${RECOVERY("project init")}`;

export const KIRO_FILES: ReadonlyArray<KiroFile> = [
  { path: "hooks/operator-memory.json", content: HOOK },
  { path: "steering/operator-memory.md", content: STEERING },
  { path: "skills/operator-user-init/SKILL.md", content: USER_INIT },
  { path: "skills/operator-project-init/SKILL.md", content: PROJECT_INIT },
];
