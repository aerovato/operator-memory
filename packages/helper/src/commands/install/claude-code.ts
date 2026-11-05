import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Effect } from "effect";

import { type CliContext, getErrorMessage, isRecord } from "../../utils.ts";
import { type ProcessResult, readOptionalFile, runProcess } from "../common.ts";

const MARKETPLACE_NAME = "operator-memory";
const PLUGIN_ID = `operator@${MARKETPLACE_NAME}`;

export const installClaudeCode = Effect.fn("installClaudeCode")(function* (context: CliContext) {
  const helper = yield* runProcess("operator-helper", ["help"], context.cwd, null);
  const helperFailure = commandFailure(helper, "Operator Helper must be available on PATH");
  if (helperFailure !== null) return helperFailure;

  const commands = [
    ["plugin", "marketplace", "add", "aerovato/operator-memory"],
    ["plugin", "install", PLUGIN_ID],
    ["plugin", "update", PLUGIN_ID],
  ];
  for (const arguments_ of commands) {
    const result = yield* runProcess("claude", arguments_, context.cwd, null);
    const failure = commandFailure(result, "Claude Code plugin installation failed");
    if (failure !== null) return failure;
  }

  const status = yield* runProcess("claude", ["plugin", "list", "--json"], context.cwd, null);
  const statusFailure = commandFailure(status, "Could not verify Claude Code plugin installation");
  if (statusFailure !== null) return statusFailure;
  if (!(status.ok && isInstalledAndEnabled(status.stdout))) {
    return {
      exitCode: 1,
      output:
        "✗ Claude Code plugin installation finished but the plugin is not installed and enabled",
    };
  }

  const updateFailure = yield* enableAutoUpdate(context);
  if (updateFailure !== null) return updateFailure;

  return {
    exitCode: 0,
    output:
      "✓ Claude Code plugin installed and enabled\n✓ Operator marketplace auto-update enabled\nStart a new Claude Code session.",
  };
});

function enableAutoUpdate(
  context: CliContext,
): Effect.Effect<{ readonly exitCode: number; readonly output: string } | null> {
  return Effect.promise(async () => {
    const configDirectory = process.env.CLAUDE_CONFIG_DIR || join(context.home, ".claude");
    const path = join(configDirectory, "settings.json");
    try {
      const content = await readOptionalFile(path);
      const settings: unknown = content === null ? {} : JSON.parse(content);
      if (!isRecord(settings)) {
        return {
          exitCode: 1,
          output: `✗ Could not enable Claude Code auto-update: ${path} must contain a JSON object`,
        };
      }
      const marketplaces =
        settings.extraKnownMarketplaces === undefined ? {} : settings.extraKnownMarketplaces;
      if (!isRecord(marketplaces)) {
        return {
          exitCode: 1,
          output:
            "✗ Could not enable Claude Code auto-update: extraKnownMarketplaces must be an object",
        };
      }
      const marketplace =
        marketplaces[MARKETPLACE_NAME] === undefined
          ? { source: { source: "github", repo: "aerovato/operator-memory" } }
          : marketplaces[MARKETPLACE_NAME];
      if (!isRecord(marketplace)) {
        return {
          exitCode: 1,
          output:
            "✗ Could not enable Claude Code auto-update: the operator-memory marketplace entry must be an object",
        };
      }
      const updated = {
        ...settings,
        extraKnownMarketplaces: {
          ...marketplaces,
          [MARKETPLACE_NAME]: { ...marketplace, autoUpdate: true },
        },
      };
      await mkdir(configDirectory, { recursive: true });
      await writeFile(path, `${JSON.stringify(updated, null, 2)}\n`);
      return null;
    } catch (error) {
      return {
        exitCode: 1,
        output: `✗ Could not enable Claude Code auto-update: ${getErrorMessage(error)}`,
      };
    }
  });
}

function isInstalledAndEnabled(output: string): boolean {
  try {
    const plugins: unknown = JSON.parse(output);
    return (
      Array.isArray(plugins)
      && plugins.some(
        plugin =>
          typeof plugin === "object"
          && plugin !== null
          && "id" in plugin
          && plugin.id === PLUGIN_ID
          && "enabled" in plugin
          && plugin.enabled === true,
      )
    );
  } catch {
    return false;
  }
}

function commandFailure(
  result: ProcessResult,
  fallback: string,
): { readonly exitCode: number; readonly output: string } | null {
  if (!result.ok) return { exitCode: 1, output: `✗ ${fallback}: ${result.error}` };
  return result.exitCode === 0
    ? null
    : { exitCode: result.exitCode, output: result.output || fallback };
}
