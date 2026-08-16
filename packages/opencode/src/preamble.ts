import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import { renderPreamble, type RenderedPreamble } from "@aerovato/operator-core/preamble";

import { failure, type Result, success } from "./utils.ts";

export type PreambleError = {
  readonly message: string;
  readonly path: string | null;
  readonly cause: unknown;
};

export type LoadPreambleOptions = {
  readonly sessionID: string;
  readonly projectDirectory: string;
  readonly homeDirectory: string;
  readonly cache: Map<string, Promise<Result<RenderedPreamble, PreambleError>>>;
};

export async function loadPreamble(
  options: LoadPreambleOptions,
): Promise<Result<RenderedPreamble, PreambleError>> {
  const cached = options.cache.get(options.sessionID);
  if (cached !== undefined) {
    return cached;
  }

  const pending = readPreamble(options.projectDirectory, options.homeDirectory);
  options.cache.set(options.sessionID, pending);
  return pending;
}

async function readPreamble(
  projectDirectory: string,
  homeDirectory: string,
): Promise<Result<RenderedPreamble, PreambleError>> {
  try {
    const memory = await loadMemorySnapshot(projectDirectory, homeDirectory, true);
    return success(renderPreamble(memory));
  } catch (cause) {
    return failure({
      message: "Operator failed to create the session preamble.",
      path: null,
      cause,
    });
  }
}
