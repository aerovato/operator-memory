import { constants, type Dirent } from "node:fs";
import { access, readdir, readFile, stat } from "node:fs/promises";

import { failure, hasNodeErrorCode, type Result, success } from "../utils.ts";

export type MemoryLoadError = {
  readonly path: string;
  readonly cause: unknown;
};

export async function readOptionalContent(
  path: string,
): Promise<Result<string | null, MemoryLoadError>> {
  try {
    return success(await readFile(path, "utf8"));
  } catch (cause) {
    return hasNodeErrorCode(cause, "ENOENT") ? success(null) : failure({ path, cause });
  }
}

export async function readContent(path: string): Promise<Result<string, MemoryLoadError>> {
  try {
    return success(await readFile(path, "utf8"));
  } catch (cause) {
    return failure({ path, cause });
  }
}

export async function readDirectory(path: string): Promise<Result<Dirent[], MemoryLoadError>> {
  try {
    return success(await readdir(path, { withFileTypes: true }));
  } catch (cause) {
    return failure({ path, cause });
  }
}

export async function checkOptionalReadableFile(
  path: string,
): Promise<Result<void, MemoryLoadError>> {
  return checkFile(path, true);
}

export async function checkReadableFile(path: string): Promise<Result<void, MemoryLoadError>> {
  return checkFile(path, false);
}

async function checkFile(
  path: string,
  allowMissing: boolean,
): Promise<Result<void, MemoryLoadError>> {
  try {
    const info = await stat(path);
    if (!info.isFile()) {
      return failure({ path, cause: new Error("Expected a file") });
    }
    await access(path, constants.R_OK);
    return success(undefined);
  } catch (cause) {
    return allowMissing && hasNodeErrorCode(cause, "ENOENT")
      ? success(undefined)
      : failure({ path, cause });
  }
}
