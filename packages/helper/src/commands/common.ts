import { SystemError } from "effect/PlatformError";
import { type FileError, PathKindError } from "../filesystem.ts";
import type { CliResult } from "../utils.ts";

export function fileFailure(error: FileError): CliResult {
  return { exitCode: 1, output: fileErrorMessage(error) };
}

export function fileErrorMessage(error: FileError): string {
  if (error instanceof PathKindError) {
    return `✗ ${error.path}: Expected a ${error.expected}, found ${error.actual}`;
  }
  const path = error.reason instanceof SystemError ? `${error.reason.pathOrDescriptor}: ` : "";
  return `✗ ${path}${error.reason.description ?? error.message}`;
}
