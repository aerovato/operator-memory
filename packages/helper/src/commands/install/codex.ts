import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Effect, PlatformError, Result, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { type CliContext, type CliResult, getErrorMessage } from "../../utils.ts";

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

  const addMarketplace = yield* runCodex(
    ["plugin", "marketplace", "add", marketplace.path, "--json"],
    context.cwd,
  );
  if (addMarketplace.exitCode !== 0) return addMarketplace;

  const install = yield* runCodex(["plugin", "add", PLUGIN_ID, "--json"], context.cwd);
  if (install.exitCode !== 0) return install;

  const status = yield* runCodex(
    ["plugin", "list", "--marketplace", MARKETPLACE_NAME, "--json"],
    context.cwd,
  );
  if (status.exitCode !== 0) return status;
  if (!isInstalledAndEnabled(status.stdout)) {
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
        && (kind !== "directory" || (await readOptional(marker)) !== MARKETPLACE_MARKER)
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

function runCodex(
  arguments_: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<
  CliResult & { readonly stdout: string },
  never,
  ChildProcessSpawner.ChildProcessSpawner
> {
  return Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const command = ChildProcess.make("codex", [...arguments_], {
      cwd,
      env: { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
      extendEnv: true,
    });
    const execution = yield* Effect.scoped(
      Effect.gen(function* () {
        const handle = yield* spawner.spawn(command);
        const [stdout, stderr, exitCode] = yield* Effect.all(
          [
            handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
            handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
            handle.exitCode,
          ] as const,
          { concurrency: "unbounded" },
        );
        return { stdout, stderr, exitCode: Number(exitCode) };
      }),
    ).pipe(Effect.result);

    if (Result.isFailure(execution)) {
      const message =
        execution.failure instanceof PlatformError.PlatformError
          ? (execution.failure.reason.description ?? execution.failure.message)
          : getErrorMessage(execution.failure);
      return { exitCode: 1, output: `✗ Could not run codex: ${message}`, stdout: "" };
    }
    const output = [execution.success.stdout.trim(), execution.success.stderr.trim()]
      .filter(Boolean)
      .join("\n");
    return execution.success.exitCode === 0
      ? { exitCode: 0, output, stdout: execution.success.stdout.trim() }
      : {
          exitCode: execution.success.exitCode,
          output: output || "Codex plugin installation failed",
          stdout: execution.success.stdout.trim(),
        };
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

async function pathKind(path: string): Promise<"missing" | "file" | "directory" | "other"> {
  try {
    const info = await lstat(path);
    return info.isFile() ? "file" : info.isDirectory() ? "directory" : "other";
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return "missing";
    throw error;
  }
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
