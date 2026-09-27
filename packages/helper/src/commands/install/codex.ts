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
