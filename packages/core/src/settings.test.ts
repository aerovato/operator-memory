import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import { defaultSettings, loadSettings } from "./settings.ts";

vi.mock("node:fs/promises", async () => {
  const { fs: memoryFileSystem } = await import("memfs");
  return {
    access: memoryFileSystem.promises.access,
    readFile: memoryFileSystem.promises.readFile,
    stat: memoryFileSystem.promises.stat,
    writeFile: memoryFileSystem.promises.writeFile,
  };
});

const HOME_DIRECTORY = "/home";
const SETTINGS_PATH = "/home/.operator/settings.json";

beforeEach(() => {
  vol.reset();
  fs.mkdirSync(HOME_DIRECTORY, { recursive: true });
});

test("uses default settings without writing when the file is missing", async () => {
  expect(await loadSettings(HOME_DIRECTORY)).toEqual({
    settings: defaultSettings,
    unparseableSettingsPath: null,
  });
  expect(fs.existsSync(SETTINGS_PATH)).toBe(false);
});

test("merges a sparse file with the default settings without writing", async () => {
  await writeSettings('{\n  "preamble": {}\n}\n');

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual(defaultSettings);
  expect(readSettings()).toBe('{\n  "preamble": {}\n}\n');
});

test("loads enabled settings", async () => {
  await writeSettings('{"preamble":{"beta":true}}');

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual({ preamble: { beta: true } });
  expect(readSettings()).toBe('{"preamble":{"beta":true}}');
});

test("removes unknown keys and invalid values while keeping valid settings", async () => {
  await writeSettings(
    '{"preamble":{"beta":true,"release":"2.1"},"preambleVersion":"2.1","theme":"dark"}',
  );

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual({ preamble: { beta: true } });
  expect(JSON.parse(readSettings())).toEqual({ preamble: { beta: true } });
});

test("falls back to default settings for invalid values", async () => {
  await writeSettings('{"preamble":{"beta":"yes"}}');

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual(defaultSettings);
  expect(JSON.parse(readSettings())).toEqual({});
});

test("rewrites a file that is not an object", async () => {
  await writeSettings("[1, 2]");

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual(defaultSettings);
  expect(readSettings()).toBe("{}\n");
});

test("uses default settings and leaves an unparseable file untouched", async () => {
  await writeSettings('{"preamble":{"beta":true},}');

  const snapshot = await loadSettings(HOME_DIRECTORY);

  expect(snapshot.settings).toEqual(defaultSettings);
  expect(snapshot.unparseableSettingsPath).toBe(SETTINGS_PATH);
  expect(readSettings()).toBe('{"preamble":{"beta":true},}');
});

async function writeSettings(content: string): Promise<void> {
  await fs.promises.mkdir("/home/.operator", { recursive: true });
  await fs.promises.writeFile(SETTINGS_PATH, content, { encoding: "utf8" });
}

function readSettings(): string {
  return String(fs.readFileSync(SETTINGS_PATH, "utf8"));
}
