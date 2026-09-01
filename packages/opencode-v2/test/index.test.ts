import type { Context } from "@opencode-ai/plugin/promise/plugin";
import { expect, test, vi } from "vitest";

const { child, emitToast, loadMemorySnapshot, loadPreamble, spawn, startAutoUpdate } = vi.hoisted(
  () => ({
    child: { on: vi.fn(), unref: vi.fn() },
    emitToast: vi.fn(() => Promise.resolve()),
    loadMemorySnapshot: vi.fn(() =>
      Promise.resolve({
        user: { ok: true as const, value: { exists: true } },
        private: { ok: true as const, value: { exists: false } },
        shared: { ok: false as const, error: { message: "failed" } },
      }),
    ),
    loadPreamble: vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { content: "operator preamble", loaded: true } }),
    ),
    spawn: vi.fn(),
    startAutoUpdate: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock("node:child_process", () => ({ spawn }));
vi.mock("@aerovato/operator-core/memory/load", () => ({ loadMemorySnapshot }));
vi.mock("../src/preamble.ts", () => ({ loadPreamble }));
vi.mock("../src/update.ts", () => ({ startAutoUpdate }));

import OperatorPlugin from "../src/index.ts";

test("registers commands and injects the preamble through the context hook", async () => {
  spawn.mockReturnValue(child);
  const addCommand = vi.fn();
  const commandTransform = vi.fn(async callback => callback({ add: addCommand }));
  const sessionHook = vi.fn();
  let statusHandler: ((input: unknown) => Promise<unknown>) | undefined;
  const context = {
    location: { directory: "/project" },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: commandTransform,
    },
    rpc: {
      register: vi.fn((_definition, handlers) => {
        statusHandler = handlers.status;
        return Promise.resolve({ events: { emit: emitToast } });
      }),
    },
    session: { hook: sessionHook },
  } as unknown as Context;

  await OperatorPlugin.setup(context);

  expect(spawn).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledWith(
    "operator-helper",
    ["version"],
    expect.objectContaining({ detached: true, stdio: "ignore", windowsHide: true }),
  );
  expect(commandTransform).toHaveBeenCalledOnce();
  expect(startAutoUpdate).toHaveBeenCalledWith(expect.any(Function));
  expect(addCommand.mock.calls.map(([command]) => command.name)).toEqual([
    "operator:user-init",
    "operator:project-init",
    "operator:index",
    "operator:repair",
  ]);
  expect(sessionHook).toHaveBeenCalledWith("context", expect.any(Function));
  const hook = sessionHook.mock.calls[0]?.[1];
  const event = { sessionID: "session-one", system: [] };
  await hook(event);
  expect(event.system).toEqual([{ type: "text", text: "operator preamble" }]);
  expect(loadPreamble).toHaveBeenCalledWith(
    expect.objectContaining({ sessionID: "session-one", projectDirectory: "/project" }),
  );
  await expect(statusHandler?.({ refresh: false })).resolves.toEqual({
    detail: "Local Build",
    user: "loaded",
    private: "uninitialized",
    shared: "error",
  });
});

test("emits one recovery toast for a failed session", async () => {
  loadPreamble.mockResolvedValue({
    ok: true,
    value: { content: "diagnostic preamble", loaded: false },
  });
  const sessionHook = vi.fn();
  const context = {
    location: { directory: "/project" },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: vi.fn(),
    },
    rpc: { register: vi.fn(() => Promise.resolve({ events: { emit: emitToast } })) },
    session: { hook: sessionHook },
  } as unknown as Context;

  await OperatorPlugin.setup(context);
  const hook = sessionHook.mock.calls[0]?.[1];
  await hook({ sessionID: "failed-session", system: [] });
  await hook({ sessionID: "failed-session", system: [] });

  expect(emitToast).toHaveBeenCalledTimes(1);
  expect(emitToast).toHaveBeenCalledWith(
    "toast",
    expect.objectContaining({ title: "Operator Error", variant: "error" }),
  );
});
