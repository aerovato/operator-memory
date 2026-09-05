import { join } from "node:path";

import { hasNodeErrorCode, type Result, success } from "../utils.ts";
import {
  checkOptionalReadableFile,
  readDirectory,
  readOptionalContent,
  type MemoryLoadError,
} from "./common.ts";

export type UserPartitionSnapshot = {
  readonly exists: boolean;
  readonly operatorInstructions: string | null;
  readonly catalog: string | null;
};

export type UserPartitionStatusSnapshot = {
  readonly exists: boolean;
};

export function loadUserPartition(
  root: string,
  loadFiles: true,
): Promise<Result<UserPartitionSnapshot, MemoryLoadError>>;
export function loadUserPartition(
  root: string,
  loadFiles: false,
): Promise<Result<UserPartitionStatusSnapshot, MemoryLoadError>>;

export async function loadUserPartition(
  root: string,
  loadFiles: boolean,
): Promise<
  | Result<UserPartitionSnapshot, MemoryLoadError>
  | Result<UserPartitionStatusSnapshot, MemoryLoadError>
> {
  if (!loadFiles) {
    const directory = await readDirectory(root);
    if (!directory.ok) {
      return hasNodeErrorCode(directory.error.cause, "ENOENT")
        ? success({ exists: false })
        : directory;
    }

    for (const path of [join(root, "operator.md"), join(root, "catalog.md")]) {
      const file = await checkOptionalReadableFile(path);
      if (!file.ok) {
        return file;
      }
    }
    return success({ exists: true });
  }

  const operatorInstructions = await readOptionalContent(join(root, "operator.md"));
  if (!operatorInstructions.ok) {
    return operatorInstructions;
  }
  const catalog = await readOptionalContent(join(root, "catalog.md"));
  if (!catalog.ok) {
    return catalog;
  }
  if (operatorInstructions.value !== null || catalog.value !== null) {
    return success({
      exists: true,
      operatorInstructions: operatorInstructions.value,
      catalog: catalog.value,
    });
  }

  const directory = await readDirectory(root);
  if (!directory.ok) {
    return hasNodeErrorCode(directory.error.cause, "ENOENT")
      ? success({ exists: false, operatorInstructions: null, catalog: null })
      : directory;
  }
  return success({ exists: true, operatorInstructions: null, catalog: null });
}
