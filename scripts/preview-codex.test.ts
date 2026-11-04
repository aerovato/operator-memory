import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ spawn: vi.fn(), mkdir: vi.fn(), write: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: mocks.spawn }));
vi.mock("node:fs/promises", () => ({ mkdir: mocks.mkdir, writeFile: mocks.write }));
vi.mock("bun", () => ({ $: () => ({ cwd: async () => undefined }) }));

const exitCode = process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.spawn.mockReturnValue({ status: 0 });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  process.exitCode = exitCode;
  vi.restoreAllMocks();
});

test("resets the old preview registration and installs from a separate local catalog", async () => {
  await import("./preview-codex.ts");
  const [path, contents] = mocks.write.mock.calls[0] ?? [];
  expect(path).toContain("/.cache/codex-marketplace/.agents/plugins/marketplace.json");
  expect(JSON.parse(contents)).toMatchObject({
    name: "operator-local",
    plugins: [{ name: "aerovato", source: expect.stringContaining("/packages/codex") }],
  });
  expect(mocks.spawn.mock.calls.map(call => call[1])).toEqual([
    ["plugin", "marketplace", "remove", "operator-local"],
    ["plugin", "marketplace", "add", expect.stringContaining("/.cache/codex-marketplace")],
    ["plugin", "add", "aerovato@operator-local"],
  ]);
});

test("allows the first preview when no old registration exists", async () => {
  mocks.spawn.mockReturnValueOnce({
    status: 1,
    stderr: "marketplace `operator-local` is not configured or installed",
  });
  await import("./preview-codex.ts");
  expect(mocks.spawn).toHaveBeenCalledTimes(3);
});

test("stops on a removal failure without adding a conflicting source", async () => {
  mocks.spawn.mockReturnValueOnce({ status: 1, stderr: "Could not write config" });
  await expect(import("./preview-codex.ts")).rejects.toThrow("Could not write config");
  expect(mocks.spawn).toHaveBeenCalledTimes(1);
});
