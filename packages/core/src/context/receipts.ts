import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { failure, hasNodeErrorCode, type Result, success } from "../utils.ts";
import { isSafePathSegment } from "./store.ts";
import type { CompactionCause } from "./compaction.ts";

// Receipt log: one JSON line per trim or compaction under
// <root>/<sessionID>.log, append-only, plain text. The caller supplies the
// root (the adapter passes `~/.operator/state/context-log`) and the timestamp;
// failures and refusals are recorded in the same file, never silent.

export type ReceiptLogError = {
  readonly path: string;
  readonly cause: unknown;
};

export type TrimReceipt = {
  readonly kind: "trim";
  readonly trigger: "ratio" | "hard-cap";
  readonly at: string;
  readonly tokens: number;
  readonly removed: number;
  readonly omissions: number;
};

export type CompactReceipt = {
  readonly kind: "compact";
  readonly trigger: CompactionCause;
  readonly at: string;
  readonly summarized: number;
};

// Recorded when context management refuses to engage (for example the Brain
// is unavailable); the feature stays off and the reason is auditable.
export type RefusalReceipt = {
  readonly kind: "refusal";
  readonly at: string;
  readonly reason: string;
};

export type ContextReceipt = TrimReceipt | CompactReceipt | RefusalReceipt;

export async function appendReceipt(
  root: string,
  sessionID: string,
  receipt: ContextReceipt,
): Promise<Result<void, ReceiptLogError>> {
  const path = join(root, `${sessionID}.log`);
  if (!isSafePathSegment(sessionID)) {
    return failure({ path, cause: new Error("Unsafe path segment") });
  }

  try {
    await mkdir(root, { recursive: true });
    await appendFile(path, `${JSON.stringify(receipt)}\n`, "utf8");
  } catch (cause) {
    return failure({ path, cause });
  }

  return success(undefined);
}

export async function readReceipts(
  root: string,
  sessionID: string,
): Promise<Result<readonly ContextReceipt[], ReceiptLogError>> {
  const path = join(root, `${sessionID}.log`);
  if (!isSafePathSegment(sessionID)) {
    return failure({ path, cause: new Error("Unsafe path segment") });
  }

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (cause) {
    return hasNodeErrorCode(cause, "ENOENT") ? success([]) : failure({ path, cause });
  }

  const receipts: ContextReceipt[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isContextReceipt(parsed)) {
        receipts.push(parsed);
      }
    } catch {
      // Skip malformed line.
    }
  }

  return success(receipts);
}

function isContextReceipt(value: unknown): value is ContextReceipt {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  const kind = value.kind;
  if (kind === "trim") {
    return "trigger" in value && "at" in value && "tokens" in value && "removed" in value;
  }
  if (kind === "compact") {
    return "trigger" in value && "at" in value && "summarized" in value;
  }
  return kind === "refusal" && "at" in value && "reason" in value;
}
