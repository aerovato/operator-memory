import { readReceipts } from "@aerovato/operator-core/context/receipts";
import { vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import type { ContextManagementConfig } from "../src/context-config.ts";
import { DEFAULT_BRAIN_PATHS, registerCompactionHook } from "../src/compaction.ts";
import { createContextRuntime } from "../src/runtime.ts";

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

const SESSION = "ses_test";
const STATE = "/home/.operator/state";

const CONFIG: ContextManagementConfig = {
  enabled: true,
  ratio: 0.8,
  hardCapTokens: 250000,
  keepRecentTurns: 3,
  compactOnComplete: true,
  compactFloorTokens: 32000,
};

function hookFake() {
  const sessionHook = vi.fn();
  const context = { session: { hook: sessionHook } };
  return { context: context as never, sessionHook };
}

function compactionEvent(messageCount: number): TestEvent {
  const messages = Array.from({ length: messageCount }, (_, index) => ({
    role: "assistant",
    content: [{ type: "text", text: `older history ${index}` }],
  }));
  return makeEvent(messages);
}

function makeEvent(
  messages: { role: string; content: { type: string; text: string }[] }[],
): TestEvent {
  return {
    sessionID: SESSION,
    model: { id: "anthropic/claude-sonnet-4", providerID: "anthropic" },
    system: [{ type: "text", text: "summarize" }],
    messages,
    options: {},
    tools: {},
    agent: "build",
    result: null,
  };
}

type TestEvent = {
  sessionID: string;
  model: { id: string; providerID: string };
  system: { type: string; text: string }[];
  messages: { role: string; content: { type: string; text: string }[] }[];
  options: Record<string, never>;
  tools: Record<string, never>;
  agent: string;
  result: { summary: string } | null;
};

const DEPS = {
  config: CONFIG,
  stateDirectory: STATE,
  brainPaths: DEFAULT_BRAIN_PATHS,
  isBrainAvailable: () => true,
};

beforeEach(() => {
  vol.reset();
});

test("shapes the request and leaves messages intact", async () => {
  const { context, sessionHook } = hookFake();
  registerCompactionHook(context, DEPS, createContextRuntime());
  const hook = sessionHook.mock.calls[0]?.[1] as (event: TestEvent) => Promise<void>;

  const event = compactionEvent(3);
  await hook(event);

  // Brain-referencing instructions land on the system prompt; nothing is
  // removed or summarized by the hook itself.
  expect(event.system).toHaveLength(2);
  const instructions = event.system[1]?.text ?? "";
  expect(instructions).toContain("~/.operator/user");
  expect(instructions).toContain("operator:read_omitted");
  expect(event.messages).toHaveLength(3);
  expect(event.result).toBeNull();

  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  expect(receipts.ok ? receipts.value[0] : null).toMatchObject({
    kind: "compact",
    trigger: "manual",
  });
});

test("labels the receipt with the recorded request cause", async () => {
  const { context, sessionHook } = hookFake();
  const runtime = createContextRuntime();
  runtime.pendingCauses.set(SESSION, "task-complete");
  registerCompactionHook(context, DEPS, runtime);
  const hook = sessionHook.mock.calls[0]?.[1] as (event: TestEvent) => Promise<void>;

  await hook(compactionEvent(1));

  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok ? receipts.value[0] : null).toMatchObject({
    kind: "compact",
    trigger: "task-complete",
  });
  // Consumed once: a later host-initiated compaction is labeled manual.
  expect(runtime.pendingCauses.has(SESSION)).toBe(false);
});

test("leaves the request alone and refuses when the Brain is unavailable", async () => {
  const { context, sessionHook } = hookFake();
  registerCompactionHook(
    context,
    { ...DEPS, isBrainAvailable: () => false },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: TestEvent) => Promise<void>;

  const event = compactionEvent(4);
  await hook(event);

  expect(event.result).toBeNull();
  expect(event.system).toHaveLength(1);
  expect(event.messages).toHaveLength(4);
  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  expect(receipts.ok ? receipts.value[0] : null).toMatchObject({
    kind: "refusal",
    reason: "brain-unavailable",
  });
});
