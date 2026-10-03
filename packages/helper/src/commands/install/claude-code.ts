import { Effect } from "effect";

import type { CliContext } from "../../utils.ts";
import { type ProcessResult, runProcess } from "../common.ts";

const PLUGIN_ID = "operator@operator-memory";

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

  return {
    exitCode: 0,
    output: "✓ Claude Code plugin installed and enabled\nStart a new Claude Code session.",
  };
});

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
