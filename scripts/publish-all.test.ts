import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { publishAll } from "./publish-all.ts";

const mocks = vi.hoisted(() => ({ shell: vi.fn(), file: vi.fn(), write: vi.fn() }));
vi.mock("bun", () => ({ $: { cwd: () => mocks.shell }, file: mocks.file, write: mocks.write }));

const versions: Record<string, [string, string]> = {
  "opencode-v2": ["2.2.1", "2.3.0"],
  pi: ["1.1.1", "1.2.0"],
  deepseek: ["0.2.1", "0.3.0"],
  codex: ["0.2.1", "0.3.0"],
  "claude-code": ["0.1.0", "0.2.0"],
  helper: ["1.9.0", "1.10.0"],
};
const calls: string[][] = [];
const bumped = new Set<string>();
let dirty = false;
let merged = true;
let mergeFails = false;

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  bumped.clear();
  dirty = false;
  merged = true;
  mergeFails = false;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(Date, "now").mockReturnValue(123);
  mocks.file.mockImplementation((path: string) => {
    const directory = path.match(/packages\/([^/]+)\//)?.[1] ?? "";
    return {
      json: async () => ({
        name: `@aerovato/operator-${directory}`,
        version: versions[directory]?.[bumped.has(directory) ? 1 : 0],
      }),
    };
  });
  mocks.shell.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const call = strings.flatMap((part, index) => [
      ...part.trim().split(/\s+/).filter(Boolean),
      ...(index < values.length ? [values[index]].flat().map(String) : []),
    ]);
    calls.push(call);
    const result = Promise.resolve().then(() => {
      const [command, ...args] = call;
      if (command === "git" && args[0] === "symbolic-ref") return "main";
      if (command === "git" && args[0] === "status") return dirty ? " M package.json" : "";
      if (command === "git" && args[0] === "rev-parse") return "release-head";
      if (command === "sh")
        return Object.values(versions).find(([current]) => current === args[1])?.[1] ?? "";
      if (command === "npm" && args[0] === "version")
        bumped.add(args.at(-1)?.split("/").at(-1) ?? "");
      if (command === "gh" && args[1] === "create") return "https://github.com/example/repo/pull/1";
      if (command === "gh" && args[1] === "merge" && mergeFails) throw new Error("Merge blocked");
      if (command === "gh" && args[1] === "view")
        return JSON.stringify({ mergeCommit: merged ? { oid: "merged-release" } : null });
      return "";
    });
    return Object.assign(result, {
      text: () => result,
      json: async () => JSON.parse(await result),
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("bumps all packages in one PR commit and pushes individual same-commit tags", async () => {
  await publishAll("minor");
  expect(calls.filter(call => call[0] === "git" && call[1] === "commit")).toHaveLength(1);
  expect(calls.filter(call => call[0] === "npm" && call[1] === "version")).toHaveLength(6);
  expect(calls.filter(call => call[0] === "bun" && call[1] === "install")).toHaveLength(1);
  expect(calls).toContainEqual([
    "gh",
    "pr",
    "merge",
    "https://github.com/example/repo/pull/1",
    "--squash",
    "--delete-branch",
    "--match-head-commit",
    "release-head",
  ]);
  expect(calls.filter(call => call[0] === "git" && call[1] === "tag")).toEqual(
    Object.entries(versions).map(([directory, [, version]]) => [
      "git",
      "tag",
      `${directory}@v${version}`,
      "merged-release",
    ]),
  );
  const pushes = calls.filter(
    call => call[0] === "git" && call[1] === "push" && call[3]?.startsWith("refs/tags/"),
  );
  expect(pushes).toHaveLength(6);
  expect(pushes.every(call => call.length === 4)).toBe(true);
  expect(pushes.at(-1)).toEqual(["git", "push", "origin", "refs/tags/helper@v1.10.0"]);
  expect(mocks.write).toHaveBeenCalledWith(
    expect.stringContaining(".claude-plugin/plugin.json"),
    expect.stringContaining('"version": "0.2.0"'),
  );
  expect(calls.some(call => call[0] === "gh" && call[1] === "run")).toBe(false);
  expect(calls.some(call => call[0] === "npm" && call[1] === "view")).toBe(false);
  expect(calls).toContainEqual(["bun", "scripts/sync-codex-version.ts"]);
  expect(
    calls.findIndex(call => call[0] === "bun" && call[1] === "scripts/sync-codex-version.ts"),
  ).toBeLessThan(calls.findIndex(call => call[0] === "git" && call[1] === "commit"));
  expect(calls.find(call => call[0] === "git" && call[1] === "add")).toEqual(
    expect.arrayContaining([
      "packages/codex/.codex-plugin/plugin.json",
      ".agents/plugins/marketplace.json",
    ]),
  );
});

test("rejects invalid input before executing commands", async () => {
  await expect(publishAll("2.0.0")).rejects.toThrow("Usage:");
  expect(calls).toHaveLength(0);
});

test("stops on a dirty worktree without changing versions", async () => {
  dirty = true;
  await expect(publishAll("minor")).rejects.toThrow("clean working tree");
  expect(bumped.size).toBe(0);
  expect(mocks.write).not.toHaveBeenCalled();
});

test("does not tag an unmerged PR", async () => {
  merged = false;
  await expect(publishAll("minor")).rejects.toThrow("has not merged");
  expect(calls.some(call => call[0] === "git" && call[1] === "tag")).toBe(false);
});

test("stops on merge failure without tags or rollback", async () => {
  mergeFails = true;
  await expect(publishAll("minor")).rejects.toThrow("Merge blocked");
  expect(
    calls.some(call => call[0] === "git" && ["tag", "reset", "revert"].includes(call[1] ?? "")),
  ).toBe(false);
});
