import type { Plugin } from "@opencode-ai/plugin";
import { afterEach, expect, test, vi } from "vitest";

const { child, client, spawn, startAutoUpdate } = vi.hoisted(() => ({
  child: { on: vi.fn(), unref: vi.fn() },
  client: {},
  spawn: vi.fn(),
  startAutoUpdate: vi.fn(() => Promise.resolve()),
}));

vi.mock("node:child_process", () => ({ spawn }));
vi.mock("../src/client.ts", () => ({ createV2Client: () => client }));
vi.mock("../src/update.ts", () => ({ startAutoUpdate }));

import OperatorPlugin from "../src/index.ts";

const originalSkipUpdate = process.env.OPERATOR_HELPER_SKIP_UPDATE;

afterEach(() => {
  if (originalSkipUpdate === undefined) delete process.env.OPERATOR_HELPER_SKIP_UPDATE;
  else process.env.OPERATOR_HELPER_SKIP_UPDATE = originalSkipUpdate;
});

test("starts one detached Helper update check", async () => {
  process.env.OPERATOR_HELPER_SKIP_UPDATE = "1";
  spawn.mockReturnValue(child);
  const input = { client: {}, directory: "/project" } as Parameters<Plugin>[0];

  await OperatorPlugin(input);
  await OperatorPlugin(input);

  expect(spawn).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledWith(
    "operator-helper",
    ["version"],
    expect.objectContaining({
      detached: true,
      env: expect.not.objectContaining({ OPERATOR_HELPER_SKIP_UPDATE: expect.anything() }),
      stdio: "ignore",
      windowsHide: true,
    }),
  );
  expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
  expect(child.unref).toHaveBeenCalledOnce();
});
