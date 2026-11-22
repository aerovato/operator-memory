import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import { listOmissions, readOmission, storeOmission } from "./store.ts";

vi.mock("node:fs/promises", async () => {
  const { fs: memoryFileSystem } = await import("memfs");
  return {
    appendFile: memoryFileSystem.promises.appendFile,
    mkdir: memoryFileSystem.promises.mkdir,
    readFile: memoryFileSystem.promises.readFile,
    writeFile: memoryFileSystem.promises.writeFile,
  };
});

const ROOT = "/state/omitted";
const SESSION = "ses_test";

beforeEach(() => {
  vol.reset();
});

test("stores a payload as one plain-text file and returns a content ID", async () => {
  const result = await storeOmission(ROOT, SESSION, "toolu_1:output", "original content");

  expect(result.ok).toBe(true);
  expect(result.ok && result.value).toBe("omitted-001");
  expect(fs.readFileSync(`${ROOT}/${SESSION}/omitted-001`, "utf8")).toBe("original content");
});

test("re-storing the same key returns the existing ID without rewriting", async () => {
  const first = await storeOmission(ROOT, SESSION, "toolu_1:output", "first body");
  const second = await storeOmission(ROOT, SESSION, "toolu_1:output", "second body");

  expect(first.ok && first.value).toBe("omitted-001");
  expect(second.ok && second.value).toBe("omitted-001");
  expect(fs.readFileSync(`${ROOT}/${SESSION}/omitted-001`, "utf8")).toBe("first body");
});

test("allocates sequential IDs across distinct keys", async () => {
  const one = await storeOmission(ROOT, SESSION, "toolu_1:output", "a");
  const two = await storeOmission(ROOT, SESSION, "toolu_1:input", "b");
  const three = await storeOmission(ROOT, SESSION, "toolu_2:output", "c");

  expect(one.ok && one.value).toBe("omitted-001");
  expect(two.ok && two.value).toBe("omitted-002");
  expect(three.ok && three.value).toBe("omitted-003");
});

test("reads back stored content and reports absence as null", async () => {
  await storeOmission(ROOT, SESSION, "toolu_1:output", "payload");

  const found = await readOmission(ROOT, SESSION, "omitted-001");
  expect(found.ok && found.value).toBe("payload");

  const missing = await readOmission(ROOT, SESSION, "omitted-404");
  expect(missing.ok && missing.value).toBeNull();
});

test("sessions are isolated by directory", async () => {
  await storeOmission(ROOT, SESSION, "toolu_1:output", "mine");
  const other = await readOmission(ROOT, "ses_other", "omitted-001");

  expect(other.ok && other.value).toBeNull();
});

test("lists index entries, skipping malformed lines", async () => {
  await storeOmission(ROOT, SESSION, "toolu_1:output", "a");
  await storeOmission(ROOT, SESSION, "toolu_2:input", "b");
  const indexPath = `${ROOT}/${SESSION}/index.jsonl`;
  fs.appendFileSync(indexPath, 'not-json\n{"key": 1, "id": 2}\n');

  const entries = await listOmissions(ROOT, SESSION);
  expect(entries.ok && entries.value).toEqual([
    { key: "toolu_1:output", id: "omitted-001" },
    { key: "toolu_2:input", id: "omitted-002" },
  ]);
});

test("rejects path traversal segments", async () => {
  const bad = await storeOmission(ROOT, "../escape", "k", "v");
  expect(bad.ok).toBe(false);

  const badRead = await readOmission(ROOT, SESSION, "../index.jsonl");
  expect(badRead.ok).toBe(false);
});
