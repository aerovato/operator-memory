import { Effect, type FileSystem, type Path } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";

import { fileFailure } from "./commands/common.ts";
import { indexInit } from "./commands/index/init.ts";
import { indexLint } from "./commands/index/lint.ts";
import { installClaudeCode } from "./commands/install/claude-code.ts";
import { installCodex } from "./commands/install/codex.ts";
import { installDeepSeek } from "./commands/install/deepseek.ts";
import { installOpenCode } from "./commands/install/opencode.ts";
import { installOpenCodeV2 } from "./commands/install/opencode-v2.ts";
import { installPi } from "./commands/install/pi.ts";
import { memoryCheck } from "./commands/memory/check.ts";
import { preamble } from "./commands/preamble.ts";
import { projectInit } from "./commands/project/init.ts";
import { projectStatus } from "./commands/project/status.ts";
import { upgrade } from "./commands/upgrade.ts";
import { userInit } from "./commands/user/init.ts";
import { userStatus } from "./commands/user/status.ts";
import { version } from "./commands/version.ts";
import type { GitRunner } from "./git.ts";
import type { NpmRegistry } from "./npm-registry.ts";
import { renderTable } from "./output.ts";
import type { CliContext, CliResult } from "./utils.ts";

const HELP = `Operator Helper

USER COMMANDS

${renderTable([
  ["help", "Show help for operator-helper"],
  ["version", "Show the installed version and check for updates"],
  ["upgrade", "Update Operator Helper to the latest release"],
  ["install codex", "Install or update the Codex plugin"],
  ["install opencode", "Install or update the OpenCode plugin"],
  ["install opencode-v2", "Install or update the OpenCode V2 plugin"],
  ["install deepseek", "Install or update the DeepSeek Harness plugin"],
  ["install pi", "Install or update the Pi plugin"],
  ["install claude-code", "Install or update the Claude Code plugin"],
])}

AGENT COMMANDS

${renderTable([
  ["user status", "Show User Partition status"],
  ["user init", "Initialize User Partition and print the setup guide"],
  ["project status", "Show Project Private, Shared, Git ignore, and tracking status"],
  ["project init", "Initialize project partitions and print the setup guide"],
  ["index init", "Show Project Index status and print the setup guide"],
  ["index lint", "Check Project Index structure and frontmatter"],
  ["memory check", "Check that all Operator memory can be loaded"],
  ["preamble", "Render the Operator preamble"],
])}`;

export function runCli(
  arguments_: ReadonlyArray<string>,
  context: CliContext,
): Effect.Effect<
  CliResult,
  never,
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | GitRunner.Service
  | NpmRegistry.Service
  | Path.Path
> {
  return Effect.gen(function* () {
    if (arguments_.length === 1 && arguments_[0] === "help") {
      return { exitCode: 0, output: HELP };
    }
    if (arguments_.length === 1 && arguments_[0] === "version") {
      return yield* version(context);
    }
    if (arguments_.length === 1 && arguments_[0] === "preamble") {
      return yield* preamble(context);
    }
    if (arguments_.length === 1 && arguments_[0] === "upgrade") {
      return yield* upgrade(context);
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
      case "project status":
        return yield* projectStatus(context);
      case "project init":
        return yield* projectInit(context);
      case "index init":
      case "index status":
        return yield* indexInit(context);
      case "index lint":
        return yield* indexLint(context);
      case "memory check":
        return yield* memoryCheck(context);
      case "install codex":
        return yield* installCodex(context);
      case "install claude-code":
        return yield* installClaudeCode(context);
      case "install opencode":
        return yield* installOpenCode(context);
      case "install opencode-v2":
        return yield* installOpenCodeV2(context);
      case "install deepseek":
        return yield* installDeepSeek(context);
      case "install pi":
        return yield* installPi(context);
      case "user guide":
      case "project guide":
      case "index guide":
        return { exitCode: 0, output: "" };
      default:
        return {
          exitCode: 2,
          output: `Unknown command: ${command}\n\n${HELP}`,
        };
    }
  }).pipe(Effect.catch(error => Effect.succeed(fileFailure(error))));
}
