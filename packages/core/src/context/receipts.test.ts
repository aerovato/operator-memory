import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import { appendReceipt, readReceipts, type ContextReceipt } from "./receipts.ts";

vi.mock("node:fs/promises", async () => {
  const { fs: memoryFileSystem } = await import("memfs");
  return {
    appendFile: memoryFileSystem.promises.appendFile,
    mkdir: memoryFileSystem.promises.mkdir,
    readFile: memoryFileSystem.promises.readFile,
  };
});

const ROOT = "/state/context-log";
const SESSION = "ses_test";

const TRIM: ContextReceipt = {
  kind: "trim",
  trigger: "ratio",
  at: "2026-10-04T12:00:00Z",
  tokens: 241000,
  removed: 98000,
  omissions: 41,
};

const COMPACT: ContextReceipt = {
  kind: "compact",
  trigger: "task-complete",
  at: "2026-10-04T12:30:00Z",
  summarized: 188000,
};

const REFUSAL: ContextReceipt = {
  kind: "refusal",
  at: "2026-10-04T13:00:00Z",
  reason: "brain-unavailable",
};

beforeEach(() => {
  vol.reset();
});

test("appends one JSON line per receipt", async () => {
  const first = await appendReceipt(ROOT, SESSION, TRIM);
  const second = await appendReceipt(ROOT, SESSION, COMPACT);
  const third = await appendReceipt(ROOT, SESSION, REFUSAL);

  expect(first.ok && second.ok && third.ok).toBe(true);

  const lines = fs.readFileSync(`${ROOT}/${SESSION}.log`, "utf8").toString().trim().split("\n");
  expect(lines).toHaveLength(3);
  expect(JSON.parse(lines[0] ?? "")).toEqual(TRIM);
  expect(JSON.parse(lines[1] ?? "")).toEqual(COMPACT);
  expect(JSON.parse(lines[2] ?? "")).toEqual(REFUSAL);
});

test("reads receipts back in order", async () => {
  await appendReceipt(ROOT, SESSION, TRIM);
  await appendReceipt(ROOT, SESSION, COMPACT);

  const result = await readReceipts(ROOT, SESSION);
  expect(result.ok && result.value).toEqual([TRIM, COMPACT]);
});

test("missing log reads as empty", async () => {
  const result = await readReceipts(ROOT, SESSION);
  expect(result.ok && result.value).toEqual([]);
});

test("sessions are isolated by log file", async () => {
  await appendReceipt(ROOT, SESSION, TRIM);

  const other = await readReceipts(ROOT, "ses_other");
  expect(other.ok && other.value).toEqual([]);
});

test("skips malformed lines when reading", async () => {
  await appendReceipt(ROOT, SESSION, TRIM);
  fs.appendFileSync(`${ROOT}/${SESSION}.log`, 'not-json\n{"kind": "mystery"}\n');

  const result = await readReceipts(ROOT, SESSION);
  expect(result.ok && result.value).toEqual([TRIM]);
});

test("rejects path traversal session IDs", async () => {
  const result = await appendReceipt(ROOT, "../escape", TRIM);
  expect(result.ok).toBe(false);
});
