import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Effect } from "effect";

import { type CliContext, getErrorMessage } from "../../utils.ts";
import { pathKind, type ProcessResult, readOptionalFile, runProcess } from "../common.ts";

const MARKETPLACE_MARKER = "Operator Memory managed Codex marketplace.\n";
const MARKETPLACE_NAME = "operator-memory";
const PLUGIN_NAME = "aerovato";
const PLUGIN_ID = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;
const MARKETPLACE = `${JSON.stringify(
  {
    name: MARKETPLACE_NAME,
    plugins: [
      {
        name: PLUGIN_NAME,
        source: {
          source: "npm",
          package: "@aerovato/operator-codex",
          version: "latest",
        },
        policy: { installation: "AVAILABLE" },
      },
    ],
  },
  null,
  2,
)}\n`;

export const installCodex = Effect.fn("installCodex")(function* (context: CliContext) {
  const marketplace = yield* writeMarketplace(context.home);
  if (!marketplace.ok) return marketplace.result;

  const addMarketplace = yield* runProcess(
    "codex",
    ["plugin", "marketplace", "add", marketplace.path, "--json"],
    context.cwd,
    { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
  );
  if (!addMarketplace.ok && isMissingBinary(addMarketplace.error)) {
    return yield* registerDesktopMarketplace(context, marketplace.path);
  }
  const addFailure = commandFailure(addMarketplace, "Codex marketplace installation failed");
  if (addFailure !== null) return addFailure;

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

function writeMarketplace(
  home: string,
): Effect.Effect<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly result: { readonly exitCode: 1; readonly output: string } }
> {
  return Effect.promise(async () => {
    const root = join(home, ".operator-helper", "codex-marketplace");
    const marker = join(root, ".operator-managed");
    const marketplace = join(root, ".agents", "plugins", "marketplace.json");
    try {
      const kind = await pathKind(root);
      if (
        kind !== "missing"
        && (kind !== "directory" || (await readOptionalFile(marker)) !== MARKETPLACE_MARKER)
      ) {
        return {
          ok: false,
          result: {
            exitCode: 1,
            output: `✗ Preserved unmanaged Codex marketplace at ${root}`,
          },
        } as const;
      }

      await mkdir(join(root, ".agents", "plugins"), { recursive: true });
      await writeFile(marker, MARKETPLACE_MARKER);
      await writeFile(marketplace, MARKETPLACE);
      return { ok: true, path: root } as const;
    } catch (error) {
      return {
        ok: false,
        result: {
          exitCode: 1,
          output: `✗ Could not prepare Codex marketplace: ${getErrorMessage(error)}`,
        },
      } as const;
    }
  });
}

function isMissingBinary(error: string): boolean {
  return error.startsWith("NotFound:");
}

function registerDesktopMarketplace(
  context: CliContext,
  marketplacePath: string,
): Effect.Effect<{ readonly exitCode: number; readonly output: string }> {
  return Effect.promise(async () => {
    const codexHome = process.env.CODEX_HOME || join(context.home, ".codex");
    const config = join(codexHome, "config.toml");
    try {
      const content = await readOptionalFile(config);
      await mkdir(codexHome, { recursive: true });
      await writeFile(config, upsertMarketplaceTable(content, marketplacePath));
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

function upsertMarketplaceTable(content: string | null, source: string): string {
  const header = `[marketplaces.${MARKETPLACE_NAME}]`;
  const block = `${header}\nsource_type = "local"\nsource = ${JSON.stringify(source)}\n`;
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
