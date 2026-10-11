import { readReceipts } from "@aerovato/operator-core/context/receipts";
import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import type { ContextManagementConfig } from "../src/context-config.ts";
import { registerContextHook } from "../src/context.ts";
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
  ratio: 0.01,
  hardCapTokens: 250000,
  keepRecentTurns: 0,
  compactOnComplete: true,
  compactFloorTokens: 32000,
};

function contextHookFake(window: number | null) {
  const sessionHook = vi.fn();
  const context = {
    session: { hook: sessionHook },
    model: {
      list: vi.fn(async () => ({
        data:
          window === null ? [] : [{ id: "anthropic/claude-sonnet-4", limit: { context: window } }],
      })),
    },
  };
  return { context: context as never, sessionHook };
}

type FakePart = Record<string, unknown>;

function fakeEvent(messages: FakePart[][], roles: readonly string[] | null) {
  return {
    sessionID: SESSION,
    model: { id: "anthropic/claude-sonnet-4", providerID: "anthropic" },
    system: [{ type: "text", text: "preamble" }],
    messages: messages.map((content, index) => ({
      role: roles?.[index] ?? "user",
      content,
    })),
    options: {},
    tools: {},
  };
}

// Wire shape: a user message opens the turn, the assistant message carries
// the tool-call, and a separate tool-role message carries the tool-result,
// linked by call ID.
const CALL_ROLES = ["user", "assistant", "tool"];
const RESULT_INDEX = 2;

// ~15k tokens of natural text, comfortably past the 0.01 ratio of a 100k
// window. Identical-character runs tokenize too efficiently for this.
const BIG_OUTPUT = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do ".repeat(1500);

function readCall() {
  const callID = "toolu_1";
  return [
    [{ type: "text", text: "read the report" }],
    [{ type: "tool-call", id: callID, name: "read", input: { filePath: "/tmp/big.txt" } }],
    [
      {
        type: "tool-result",
        id: callID,
        name: "read",
        result: { type: "text", value: BIG_OUTPUT },
      },
    ],
  ];
}

beforeEach(() => {
  vol.reset();
});

test("leaves small sessions untouched and writes no receipt", async () => {
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    createContextRuntime(),
  );

  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;
  const event = fakeEvent([[{ type: "text", text: "hello" }]], null);

  await hook(event);

  expect(event.messages[0]?.content[0]).toEqual({ type: "text", text: "hello" });
  expect(fs.existsSync(`${STATE}/context-log/${SESSION}.log`)).toBe(false);
  expect(requestCompaction).not.toHaveBeenCalled();
});

test("trims past the ratio threshold and writes a trim receipt", async () => {
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  const event = fakeEvent(readCall(), CALL_ROLES);
  await hook(event);

  const resultPart = (event.messages[RESULT_INDEX]?.content[0] ?? {}) as {
    result: { value: string };
  };
  expect(resultPart.result.value).toContain("<tool-output-omission-notice>");
  expect(resultPart.result.value).toContain("Content ID: omitted-001");

  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  const receipt = receipts.ok ? receipts.value[0] : null;
  expect(receipt).toMatchObject({ kind: "trim", trigger: "ratio" });
});

test("re-trimming after a restart reuses the same omission ID", async () => {
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    {
      config: CONFIG,
      stateDirectory: STATE,
      isBrainAvailable: () => true,
      requestCompaction,
    },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  // Untrimmable user bulk keeps the post-trim estimate over threshold, so
  // the first fire also requests a compaction.
  const bulky = () => [
    [{ type: "text", text: "lorem ipsum dolor sit amet ".repeat(800) }],
    ...readCall(),
  ];
  const bulkyRoles = ["user", "user", "assistant", "tool"];
  const bulkyResultIndex = 3;

  const first = fakeEvent(bulky(), bulkyRoles);
  await hook(first);
  const firstNotice = (
    (first.messages[bulkyResultIndex]?.content[0] ?? {}) as { result: { value: string } }
  ).result.value;
  expect(requestCompaction).toHaveBeenCalledTimes(1);

  // A fresh runtime (process restart) re-plans the same trim; the store still
  // holds the key, so the rebuilt notice is byte-identical.
  registerContextHook(
    context,
    {
      config: CONFIG,
      stateDirectory: STATE,
      isBrainAvailable: () => true,
      requestCompaction,
    },
    createContextRuntime(),
  );
  const hookAfterRestart = sessionHook.mock.calls[1]?.[1] as (event: unknown) => Promise<void>;
  const second = fakeEvent(bulky(), bulkyRoles);
  await hookAfterRestart(second);
  const secondNotice = (
    (second.messages[bulkyResultIndex]?.content[0] ?? {}) as { result: { value: string } }
  ).result.value;

  expect(secondNotice).toContain("Content ID: omitted-001");
  expect(secondNotice).toBe(firstNotice);

  // The restart inherited the dedup state from the receipt log: the trim
  // still applies, but no second receipt and no second compaction request.
  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  expect(requestCompaction).toHaveBeenCalledTimes(1);
});

test("requests compaction when the estimate stays over threshold after trim", async () => {
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  // ~30k tokens of context; trimming removes almost nothing.
  await hook(fakeEvent([[{ type: "text", text: "word ".repeat(40000) }]], null));

  expect(requestCompaction).toHaveBeenCalledWith(SESSION, "ratio");
});

test("ratio cannot fire when the model window is unknown", async () => {
  const { context, sessionHook } = contextHookFake(null);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  const event = fakeEvent(readCall(), CALL_ROLES);
  await hook(event);

  const result = (
    (event.messages[RESULT_INDEX]?.content[0] ?? {}) as { result: { value: string } | null }
  ).result;
  expect(result?.value).toBe(BIG_OUTPUT);
  expect(requestCompaction).not.toHaveBeenCalled();
});

test("stays off and records one refusal when the Brain is unavailable", async () => {
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    {
      config: CONFIG,
      stateDirectory: STATE,
      isBrainAvailable: () => false,
      requestCompaction,
    },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  const first = fakeEvent(readCall(), CALL_ROLES);
  await hook(first);
  const second = fakeEvent(readCall(), CALL_ROLES);
  await hook(second);

  // Untouched: full output survives, no trim, no compaction.
  const result = ((first.messages[RESULT_INDEX]?.content[0] ?? {}) as { result: { value: string } })
    .result;
  expect(result.value).toBe(BIG_OUTPUT);
  expect(requestCompaction).not.toHaveBeenCalled();

  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  expect(receipts.ok ? receipts.value[0] : null).toMatchObject({
    kind: "refusal",
    reason: "brain-unavailable",
  });
});

test("leaves parts intact when the omission store fails", async () => {
  // A file where the state directory should be makes every store and receipt
  // write fail; trimming degrades to a no-op instead of failing the request.
  fs.mkdirSync("/home/.operator", { recursive: true });
  fs.writeFileSync(STATE, "blocking");
  const { context, sessionHook } = contextHookFake(100000);
  const requestCompaction = vi.fn();
  registerContextHook(
    context,
    {
      config: CONFIG,
      stateDirectory: STATE,
      isBrainAvailable: () => true,
      requestCompaction,
    },
    createContextRuntime(),
  );
  const hook = sessionHook.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

  const event = fakeEvent(readCall(), CALL_ROLES);
  await hook(event);

  const result = (
    (event.messages[RESULT_INDEX]?.content[0] ?? {}) as { result: { value: string } | null }
  ).result;
  expect(result?.value).toBe(BIG_OUTPUT);
  // Still over threshold with nothing removed, so compaction is requested.
  expect(requestCompaction).toHaveBeenCalledWith(SESSION, "ratio");
});
