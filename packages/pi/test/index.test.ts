import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { beforeEach, expect, test, vi } from "vitest";

const childProcess = vi.hoisted(() => ({ spawn: vi.fn() }));
const core = vi.hoisted(() => ({
  loadMemorySnapshot: vi.fn(),
  renderPreamble: vi.fn(),
}));

vi.mock("node:child_process", () => ({ spawn: childProcess.spawn }));
vi.mock("@aerovato/operator-core/memory/load", () => ({
  loadMemorySnapshot: core.loadMemorySnapshot,
}));
vi.mock("@aerovato/operator-core/preamble", () => ({
  renderPreamble: core.renderPreamble,
}));

import operatorPi from "../src/index.ts";

type TestContext = {
  readonly cwd: string;
  readonly hasUI: boolean;
  readonly abort: ReturnType<typeof vi.fn>;
  readonly ui: {
    readonly notify: ReturnType<typeof vi.fn>;
    readonly setStatus: ReturnType<typeof vi.fn>;
    readonly theme: { readonly fg: ReturnType<typeof vi.fn> };
  };
};

type ContextHandler = (
  event: { readonly messages: unknown[] },
  context: TestContext,
) => Promise<{ readonly messages: unknown[] }>;
type LifecycleHandler = (event: object, context: TestContext) => void;

beforeEach(() => {
  childProcess.spawn.mockReset();
  childProcess.spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });
  core.loadMemorySnapshot.mockReset();
  core.renderPreamble.mockReset();
});

test("coalesces rendering and reuses the complete synthetic message", async () => {
  const deferred = Promise.withResolvers<object>();
  core.loadMemorySnapshot.mockReturnValue(deferred.promise);
  core.renderPreamble.mockReturnValue({ loaded: true, content: "preamble" });
  const extension = createExtension();
  const context = createContext();

  const firstPending = extension.context({ messages: [] }, context);
  const secondPending = extension.context({ messages: [] }, context);
  expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();

  deferred.resolve({});
  const [first, second] = await Promise.all([firstPending, secondPending]);
  expect(first.messages[0]).toBe(second.messages[0]);
  expect(first.messages[0]).toEqual({
    role: "user",
    content: [{ type: "text", text: "preamble" }],
    timestamp: expect.any(Number),
  });

  const repeated = await extension.context({ messages: [] }, context);
  expect(repeated.messages[0]).toBe(first.messages[0]);
  expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();
});

test("starts one detached Helper update check per extension runtime", () => {
  createExtension();

  expect(childProcess.spawn).toHaveBeenCalledOnce();
  expect(childProcess.spawn).toHaveBeenCalledWith(
    "operator-helper",
    ["version"],
    expect.objectContaining({ detached: true, stdio: "ignore" }),
  );
});

test("sets and clears the local-build status with the session lifecycle", () => {
  const extension = createExtension();
  const context = createContext();

  extension.start({}, context);
  extension.shutdown({}, context);

  expect(context.ui.setStatus).toHaveBeenNthCalledWith(
    1,
    "__operator",
    "[accent] · Operator Active (Local Build)",
  );
  expect(context.ui.setStatus).toHaveBeenNthCalledWith(2, "__operator", undefined);
});

test("injects a canonical load diagnostic and shows one recovery notice", async () => {
  core.loadMemorySnapshot.mockResolvedValue({});
  core.renderPreamble.mockReturnValue({ loaded: false, content: "canonical diagnostic" });
  const extension = createExtension();
  const context = createContext();

  const first = await extension.context({ messages: [] }, context);
  const second = await extension.context({ messages: [] }, context);

  expect(first.messages[0]).toMatchObject({
    role: "user",
    content: [{ type: "text", text: "canonical diagnostic" }],
  });
  expect(second.messages[0]).toBe(first.messages[0]);
  expect(context.ui.notify).toHaveBeenCalledOnce();
  expect(context.ui.setStatus).toHaveBeenCalledWith("__operator", "[error] · Operator Unavailable");
  expect(context.abort).not.toHaveBeenCalled();
});

test("aborts every affected call after an unexpected render failure", async () => {
  core.loadMemorySnapshot.mockRejectedValue(new Error("read failed"));
  const extension = createExtension();
  const context = createContext();
  const original = [{ role: "user", content: "request" }];
  const provider = vi.fn();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await extension.context({ messages: original }, context);
    if (context.abort.mock.calls.length === 0) provider(result.messages);
    expect(result.messages).toBe(original);
  }

  expect(context.abort).toHaveBeenCalledTimes(2);
  expect(context.ui.notify).toHaveBeenCalledOnce();
  expect(context.ui.setStatus).toHaveBeenCalledWith("__operator", "[error] · Operator Error");
  expect(provider).not.toHaveBeenCalled();
  expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();
});

test("clears cached state on session shutdown", async () => {
  core.loadMemorySnapshot.mockResolvedValue({});
  core.renderPreamble
    .mockReturnValueOnce({ loaded: true, content: "first" })
    .mockReturnValueOnce({ loaded: true, content: "second" });
  const extension = createExtension();
  const context = createContext();

  const first = await extension.context({ messages: [] }, context);
  extension.shutdown({}, context);
  const second = await extension.context({ messages: [] }, context);

  expect(first.messages[0]).not.toBe(second.messages[0]);
  expect(core.loadMemorySnapshot).toHaveBeenCalledTimes(2);
});

function createExtension(): {
  readonly context: ContextHandler;
  readonly start: LifecycleHandler;
  readonly shutdown: LifecycleHandler;
} {
  const handlers = new Map<string, unknown>();
  operatorPi({
    on: (event: string, handler: unknown) => handlers.set(event, handler),
    registerCommand: vi.fn(),
  } as unknown as ExtensionAPI);
  return {
    context: handlers.get("context") as ContextHandler,
    start: handlers.get("session_start") as LifecycleHandler,
    shutdown: handlers.get("session_shutdown") as LifecycleHandler,
  };
}

function createContext(): TestContext {
  return {
    cwd: "/project",
    hasUI: true,
    abort: vi.fn(),
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
      theme: { fg: vi.fn((color: string, text: string) => `[${color}] ${text}`) },
    },
  };
}
