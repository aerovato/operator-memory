import type { Context } from "@opencode/plugin/promise/plugin";
import { vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

const { emitToast, loadMemorySnapshot, loadPreamble } = vi.hoisted(() => ({
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
}));

vi.mock("@aerovato/operator-core/memory/load", () => ({ loadMemorySnapshot }));
vi.mock("../src/preamble.ts", () => ({ loadPreamble }));
vi.mock("node:fs/promises", async () => {
  const { fs: memoryFileSystem } = await import("memfs");
  return {
    access: memoryFileSystem.promises.access,
    appendFile: memoryFileSystem.promises.appendFile,
    mkdir: memoryFileSystem.promises.mkdir,
    readFile: memoryFileSystem.promises.readFile,
    readdir: memoryFileSystem.promises.readdir,
    stat: memoryFileSystem.promises.stat,
    writeFile: memoryFileSystem.promises.writeFile,
  };
});

import OperatorPlugin from "../src/index.ts";

beforeEach(() => {
  vol.reset();
});

test("registers commands and injects the preamble through the context hook", async () => {
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

  expect(commandTransform).toHaveBeenCalledOnce();
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

function enabledContext(contextManagement: Record<string, unknown>) {
  async function* emptyStream(): AsyncGenerator<never> {
    // No events.
  }
  const sessionHook = vi.fn();
  const subscribe = vi.fn(() => emptyStream());
  const toolTransform = vi.fn(async callback => callback({ namespace: vi.fn(), add: vi.fn() }));
  const context = {
    location: { directory: "/project" },
    options: { operator: { contextManagement } },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: vi.fn(),
    },
    rpc: { register: vi.fn(() => Promise.resolve({ events: { emit: emitToast } })) },
    session: { hook: sessionHook },
    event: { subscribe },
    model: { list: vi.fn(async () => ({ data: [] })) },
    tool: { transform: toolTransform },
  } as unknown as Context;
  return { context, sessionHook, subscribe, toolTransform };
}

test("registers context management hooks and tools when enabled", async () => {
  const { context, sessionHook, subscribe, toolTransform } = enabledContext({ enabled: true });

  await OperatorPlugin.setup(context);

  expect(sessionHook.mock.calls.map(([name]) => name)).toEqual([
    "context",
    "context",
    "compaction",
  ]);
  expect(subscribe).toHaveBeenCalled();
  expect(toolTransform).toHaveBeenCalledOnce();
});

test("stays inert when disabled", async () => {
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

  expect(sessionHook).toHaveBeenCalledOnce();
  expect(sessionHook).toHaveBeenCalledWith("context", expect.any(Function));
});

test("toasts on invalid context management options", async () => {
  const sessionHook = vi.fn();
  const context = {
    location: { directory: "/project" },
    options: { operator: { contextManagement: { enabled: "yes" } } },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: vi.fn(),
    },
    rpc: { register: vi.fn(() => Promise.resolve({ events: { emit: emitToast } })) },
    session: { hook: sessionHook },
  } as unknown as Context;
  emitToast.mockClear();

  await OperatorPlugin.setup(context);

  expect(sessionHook).toHaveBeenCalledOnce();
  expect(emitToast).toHaveBeenCalledWith(
    "toast",
    expect.objectContaining({ title: "Operator Error", variant: "error" }),
  );
});

test("trims only when the Brain is initialized", async () => {
  const big = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do ".repeat(500);
  const readMessages = () => {
    const callID = "toolu_1";
    return [
      { role: "user", content: [{ type: "text", text: "read it" }] },
      {
        role: "assistant",
        content: [{ type: "tool-call", id: callID, name: "read", input: { filePath: "/x" } }],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            id: callID,
            name: "read",
            result: { type: "text", value: big },
          },
        ],
      },
    ];
  };
  const resultValue = (event: { messages: { content: { result: unknown | null }[] }[] }) => {
    const part = event.messages[2]?.content[0] as { result: { value: string } };
    return part.result.value;
  };
  async function drive(initialized: boolean) {
    loadPreamble.mockResolvedValue({
      ok: true as const,
      value: { content: "operator preamble", loaded: true, initialized },
    });
    const { context, sessionHook } = enabledContext({
      enabled: true,
      hardCapTokens: 2000,
      keepRecentTurns: 0,
    });
    await OperatorPlugin.setup(context);
    const [preambleHook, trimHook] = sessionHook.mock.calls.map(([, hook]) => hook) as [
      (event: unknown) => Promise<void>,
      (event: unknown) => Promise<void>,
    ];
    await preambleHook({ sessionID: "ses-gate", system: [] });
    const event = {
      sessionID: "ses-gate",
      model: { id: "anthropic/claude-sonnet-4", providerID: "anthropic" },
      system: [],
      messages: readMessages(),
      options: {},
      tools: {},
    };
    await trimHook(event);
    return event;
  }

  const trimmed = await drive(true);
  expect(resultValue(trimmed)).toContain("<tool-output-omission-notice>");

  const refused = await drive(false);
  expect(resultValue(refused)).toBe(big);
});
