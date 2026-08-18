import { Effect, type FileSystem, type Path } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";

import { indexGuide } from "./commands/index/guide.ts";
import { indexLint } from "./commands/index/lint.ts";
import { indexStatus } from "./commands/index/status.ts";
import { installOpenCode } from "./commands/install.ts";
import { memoryCheck } from "./commands/memory/check.ts";
import { projectGuide } from "./commands/project/guide.ts";
import { projectInit } from "./commands/project/init.ts";
import { projectStatus } from "./commands/project/status.ts";
import { userGuide } from "./commands/user/guide.ts";
import { userInit } from "./commands/user/init.ts";
import { userStatus } from "./commands/user/status.ts";
import { fileFailure } from "./commands/common.ts";
import type { GitRunner } from "./git.ts";
import { renderTable } from "./output.ts";
import type { CliContext, CliResult } from "./utils.ts";

const HELP = `Operator Helper

USER COMMANDS

${renderTable([
  ["help", "Show help for operator-helper"],
  ["version", "Show the installed version"],
  ["operator-helper install opencode", "Install or update the OpenCode plugin"],
])}

AGENT COMMANDS

${renderTable([
  ["operator-helper user status", "Show User Instructions status"],
  ["operator-helper user init", "Initialize User Instructions without overwriting content"],
  ["operator-helper user guide", "Print the agent guide for completing User Setup"],
  [
    "operator-helper project status",
    "Show Project Private, Shared, Git ignore, and tracking status",
  ],
  ["operator-helper project init", "Initialize project partitions and global Git ignore"],
  ["operator-helper project guide", "Print the agent guide for completing Project Setup"],
  ["operator-helper index status", "Show Private and Shared main Project Index status"],
  ["operator-helper index guide", "Print the agent guide for building or refreshing indexes"],
  ["operator-helper index lint", "Check Project Index structure and frontmatter"],
  ["operator-helper memory check", "Check that all Operator memory can be loaded"],
])}`;

export function runCli(
  arguments_: ReadonlyArray<string>,
  context: CliContext,
): Effect.Effect<
  CliResult,
  never,
  ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | GitRunner.Service | Path.Path
> {
  return Effect.gen(function* () {
    if (arguments_.length === 1 && arguments_[0] === "help") {
      return { exitCode: 0, output: HELP };
    }
    if (arguments_.length === 1 && arguments_[0] === "version") {
      return { exitCode: 0, output: context.version };
    }
    if (arguments_.length !== 2) {
      return { exitCode: 2, output: HELP };
    }

    const command = `${arguments_[0]} ${arguments_[1]}`;
    switch (command) {
      case "user status":
        return yield* userStatus(context);
      case "user init":
        return yield* userInit(context);
      case "user guide":
        return yield* userGuide();
      case "project status":
        return yield* projectStatus(context);
      case "project init":
        return yield* projectInit(context);
      case "project guide":
        return yield* projectGuide();
      case "index status":
        return yield* indexStatus(context);
      case "index guide":
        return yield* indexGuide();
      case "index lint":
        return yield* indexLint(context);
      case "memory check":
        return yield* memoryCheck(context);
      case "install opencode":
        return yield* installOpenCode(context);
      default:
        return {
          exitCode: 2,
          output: `Unknown command: ${command}\n\n${HELP}`,
        };
    }
  }).pipe(Effect.catch(error => Effect.succeed(fileFailure(error))));
}
