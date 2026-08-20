import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

import { type CliContext, getErrorMessage } from "../../utils.ts";

const CODE_PUPPY_MARKER = "Operator Memory managed Code Puppy plugin.\n";
const CODE_PUPPY_MARKER_FILE = ".operator-managed";

export const installCodePuppy = Effect.fn("installCodePuppy")(function* (context: CliContext) {
  return yield* Effect.promise(async () => {
    try {
      const source = await readFile(await codePuppyAdapterPath(), "utf8");
      const plugins = join(context.home, ".code_puppy", "plugins");
      const target = join(plugins, "operator");
      const marker = join(target, CODE_PUPPY_MARKER_FILE);
      const callbacks = join(target, "register_callbacks.py");
      const targetKind = await pathKind(target);

      if (targetKind === "missing") {
        await mkdir(plugins, { recursive: true });
        const staged = `${target}.tmp-${randomUUID()}`;
        try {
          await mkdir(staged);
          await writeFile(join(staged, CODE_PUPPY_MARKER_FILE), CODE_PUPPY_MARKER);
          await writeFile(join(staged, "register_callbacks.py"), source);
          await rename(staged, target);
        } finally {
          await rm(staged, { recursive: true, force: true });
        }
        return { exitCode: 0, output: "✓ Code Puppy plugin installed" };
      }

      if (targetKind !== "directory" || (await readOptional(marker)) !== CODE_PUPPY_MARKER) {
        return {
          exitCode: 1,
          output: `✗ Preserved unmanaged Code Puppy plugin at ${target}`,
        };
      }

      if ((await readOptional(callbacks)) === source) {
        return { exitCode: 0, output: "✓ Code Puppy plugin is current" };
      }

      const staged = `${callbacks}.tmp-${randomUUID()}`;
      try {
        await writeFile(staged, source);
        await rename(staged, callbacks);
      } finally {
        await rm(staged, { force: true });
      }
      return { exitCode: 0, output: "✓ Code Puppy plugin updated" };
    } catch (error) {
      return {
        exitCode: 1,
        output: `✗ Could not install Code Puppy plugin: ${getErrorMessage(error)}`,
      };
    }
  });
});

async function codePuppyAdapterPath(): Promise<string> {
  const candidates = [
    new URL("./code-puppy/register_callbacks.py", import.meta.url),
    new URL("../../../../code-puppy/operator/register_callbacks.py", import.meta.url),
  ];
  for (const candidate of candidates) {
    const path = fileURLToPath(candidate);
    if ((await pathKind(path)) === "file") {
      return path;
    }
  }
  throw new Error("bundled Code Puppy adapter is missing");
}

async function pathKind(path: string): Promise<"missing" | "file" | "directory" | "other"> {
  try {
    const info = await lstat(path);
    return info.isFile() ? "file" : info.isDirectory() ? "directory" : "other";
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "missing";
    }
    throw error;
  }
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
