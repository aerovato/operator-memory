import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Effect } from "effect";

import { type CliContext, getErrorMessage } from "../../utils.ts";
import { type ProcessResult, readOptionalFile, runProcess } from "../common.ts";

const MARKETPLACE_SOURCE = "https://github.com/aerovato/operator-memory.git";
const MARKETPLACE_NAME = "operator-memory";
const PLUGIN_ID = `aerovato@${MARKETPLACE_NAME}`;

export const installCodex = Effect.fn("installCodex")(function* (context: CliContext) {
  const addMarketplace = yield* runProcess(
    "codex",
    ["plugin", "marketplace", "add", MARKETPLACE_SOURCE, "--ref", "main", "--json"],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  if (!addMarketplace.ok && isMissingBinary(addMarketplace.error)) {
    return yield* registerDesktopMarketplace(context);
  }
  const addFailure = commandFailure(addMarketplace, "Codex marketplace installation failed");
  if (addFailure !== null) return addFailure;

  const upgrade = yield* runProcess(
    "codex",
    ["plugin", "marketplace", "upgrade", MARKETPLACE_NAME, "--json"],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  const upgradeFailure = commandFailure(upgrade, "Codex marketplace upgrade failed");
  if (upgradeFailure !== null) return upgradeFailure;

  const install = yield* runProcess("codex", ["plugin", "add", PLUGIN_ID, "--json"], context.cwd, {
    NPM_CONFIG_MIN_RELEASE_AGE: "0",
  });
  const installFailure = commandFailure(install, "Codex plugin installation failed");
  if (installFailure !== null) return installFailure;

  const status = yield* runProcess(
    "codex",
    ["plugin", "list", "--marketplace", MARKETPLACE_NAME, "--json"],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  const statusFailure = commandFailure(status, "Could not verify Codex plugin installation");
  if (statusFailure !== null) return statusFailure;
  if (!(status.ok && isInstalledAndEnabled(status.stdout))) {
    return {
      exitCode: 1,
      output: "✗ Codex plugin installation finished but the plugin is not installed and enabled",
    };
  }

  return {
    exitCode: 0,
    output: [
      "✓ Codex plugin installed and enabled",
      "Start a new Codex session and approve the Operator hooks if prompted.",
    ].join("\n"),
  };
});

function isMissingBinary(error: string): boolean {
  return error.startsWith("NotFound:");
}

function registerDesktopMarketplace(
  context: CliContext,
): Effect.Effect<{ readonly exitCode: number; readonly output: string }> {
  return Effect.promise(async () => {
    const codexHome = process.env.CODEX_HOME || join(context.home, ".codex");
    const config = join(codexHome, "config.toml");
    try {
      const content = await readOptionalFile(config);
      await mkdir(codexHome, { recursive: true });
      await writeFile(config, upsertMarketplaceTable(content));
    } catch (error) {
      return {
        exitCode: 1,
        output: `✗ Could not register the Codex marketplace: ${getErrorMessage(error)}`,
      };
    }

    return {
      exitCode: 0,
      output: [
        "✓ Registered the Operator Codex marketplace",
        "Codex CLI unavailable: install aerovato@operator-memory from the Codex plugins browser, then start a new session and approve the Operator hooks.",
      ].join("\n"),
    };
  });
}

function upsertMarketplaceTable(content: string | null): string {
  const header = `[marketplaces.${MARKETPLACE_NAME}]`;
  const block = `${header}\nsource_type = "git"\nsource = ${JSON.stringify(MARKETPLACE_SOURCE)}\nref = "main"\n`;
  if (content === null) return block;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^marketplaces\s*=/.test(trimmed) || /^marketplaces\./.test(trimmed)) {
      throw new Error("config.toml expresses marketplaces without tables; refusing to edit it");
    }
  }

  const headerPattern = new RegExp(`^\\[\\s*marketplaces\\.${MARKETPLACE_NAME}\\s*\\]$`);
  const headerIndex = lines.findIndex(line => headerPattern.test(line.trim()));
  if (headerIndex === -1) {
    return content.endsWith("\n") || content.length === 0
      ? `${content}${block}`
      : `${content}\n${block}`;
  }

  let end = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && /^\s*\[\[?/.test(line)) {
      end = index;
      break;
    }
  }
  return [...lines.slice(0, headerIndex), ...block.split("\n"), ...lines.slice(end)].join("\n");
}

function isInstalledAndEnabled(output: string): boolean {
  try {
    const value: unknown = JSON.parse(output);
    if (typeof value !== "object" || value === null || !("installed" in value)) return false;
    const installed = (value as { readonly installed: unknown }).installed;
    return (
      Array.isArray(installed)
      && installed.some(
        plugin =>
          typeof plugin === "object"
          && plugin !== null
          && "pluginId" in plugin
          && plugin.pluginId === PLUGIN_ID
          && "installed" in plugin
          && plugin.installed === true
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
  if (!result.ok) return { exitCode: 1, output: `✗ Could not run codex: ${result.error}` };
  return result.exitCode === 0
    ? null
    : { exitCode: result.exitCode, output: result.output || fallback };
}
