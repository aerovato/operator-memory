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

    const operatorInstructions = await checkOptionalReadableFile(join(root, "operator.md"));
    return operatorInstructions.ok ? success({ exists: true }) : operatorInstructions;
  }

  const operatorInstructions = await readOptionalContent(join(root, "operator.md"));
  if (!operatorInstructions.ok) {
    return operatorInstructions;
  }
  if (operatorInstructions.value !== null) {
    return success({ exists: true, operatorInstructions: operatorInstructions.value });
  }

  const directory = await readDirectory(root);
  if (!directory.ok) {
    return hasNodeErrorCode(directory.error.cause, "ENOENT")
      ? success({ exists: false, operatorInstructions: null })
      : directory;
  }
  return success({ exists: true, operatorInstructions: null });
}
