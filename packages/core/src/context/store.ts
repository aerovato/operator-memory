import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { failure, hasNodeErrorCode, type Result, success } from "../utils.ts";

// Omission store: one plain-text file per payload under
// <root>/<sessionID>/<contentID>, append-only. A per-session index file
// (<root>/<sessionID>/index.jsonl) maps the stable trim key
// (`<callID>:input` / `<callID>:output`) to its content ID. Re-storing an
// existing key returns the existing ID without rewriting anything, which is
// what makes re-trimming byte-identical across requests. The caller supplies
// the root (the adapter passes `~/.operator/state/omitted`); core stays
// harness-agnostic.

export type OmissionStoreError = {
  readonly path: string;
  readonly cause: unknown;
};

export type OmissionIndexEntry = {
  readonly key: string;
  readonly id: string;
};

const INDEX_FILE = "index.jsonl";
const ID_PREFIX = "omitted-";

export async function storeOmission(
  root: string,
  sessionID: string,
  key: string,
  content: string,
): Promise<Result<string, OmissionStoreError>> {
  const sessionRoot = join(root, sessionID);
  if (!isSafePathSegment(sessionID) || !isSafePathSegment(key)) {
    return failure({ path: sessionRoot, cause: new Error("Unsafe path segment") });
  }

  const directoryResult = await mkdirSafe(sessionRoot);
  if (!directoryResult.ok) {
    return directoryResult;
  }

  const entriesResult = await readIndex(sessionRoot);
  if (!entriesResult.ok) {
    return entriesResult;
  }

  const existing = entriesResult.value.find(entry => entry.key === key);
  if (existing !== undefined) {
    return success(existing.id);
  }

  const id = formatContentID(nextId(entriesResult.value));
  const payloadPath = join(sessionRoot, id);

  try {
    await writeFile(payloadPath, content, "utf8");
    await appendFile(indexPath(sessionRoot), `${JSON.stringify({ key, id })}\n`, "utf8");
  } catch (cause) {
    return failure({ path: payloadPath, cause });
  }

  return success(id);
}

export async function readOmission(
  root: string,
  sessionID: string,
  contentID: string,
): Promise<Result<string | null, OmissionStoreError>> {
  const payloadPath = join(root, sessionID, contentID);
  if (!isSafePathSegment(sessionID) || !isSafePathSegment(contentID)) {
    return failure({ path: payloadPath, cause: new Error("Unsafe path segment") });
  }

  try {
    return success(await readFile(payloadPath, "utf8"));
  } catch (cause) {
    return hasNodeErrorCode(cause, "ENOENT")
      ? success(null)
      : failure({ path: payloadPath, cause });
  }
}

export async function listOmissions(
  root: string,
  sessionID: string,
): Promise<Result<readonly OmissionIndexEntry[], OmissionStoreError>> {
  if (!isSafePathSegment(sessionID)) {
    return failure({ path: join(root, sessionID), cause: new Error("Unsafe path segment") });
  }
  return readIndex(join(root, sessionID));
}

async function readIndex(
  sessionRoot: string,
): Promise<Result<readonly OmissionIndexEntry[], OmissionStoreError>> {
  const path = indexPath(sessionRoot);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (cause) {
    return hasNodeErrorCode(cause, "ENOENT") ? success([]) : failure({ path, cause });
  }

  // Append-only log: malformed lines are skipped, never fatal.
  const entries: OmissionIndexEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        typeof parsed === "object"
        && parsed !== null
        && "key" in parsed
        && "id" in parsed
        && typeof parsed.key === "string"
        && typeof parsed.id === "string"
      ) {
        entries.push({ key: parsed.key, id: parsed.id });
      }
    } catch {
      // Skip malformed line.
    }
  }

  return success(entries);
}

async function mkdirSafe(path: string): Promise<Result<void, OmissionStoreError>> {
  try {
    await mkdir(path, { recursive: true });
    return success(undefined);
  } catch (cause) {
    return failure({ path, cause });
  }
}

function indexPath(sessionRoot: string): string {
  return join(sessionRoot, INDEX_FILE);
}

function nextId(entries: readonly OmissionIndexEntry[]): number {
  let max = 0;
  for (const entry of entries) {
    const suffix = entry.id.startsWith(ID_PREFIX) ? entry.id.slice(ID_PREFIX.length) : null;
    const value = suffix === null ? Number.NaN : Number.parseInt(suffix, 10);
    if (!Number.isNaN(value) && value > max) {
      max = value;
    }
  }
  return max + 1;
}

function formatContentID(id: number): string {
  return `${ID_PREFIX}${String(id).padStart(3, "0")}`;
}

export function isSafePathSegment(segment: string): boolean {
  return (
    segment.length > 0 && !segment.includes("/") && !segment.includes("\\") && segment !== ".."
  );
}
