import { readReceipts } from "@aerovato/operator-core/context/receipts";
import { vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import type { ContextManagementConfig } from "../src/context-config.ts";
import {
  dispatchEvent,
  registerCompletionTrigger,
  requestSessionCompaction,
} from "../src/events.ts";
import { createContextRuntime, sessionRuntime } from "../src/runtime.ts";

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

const STEP_TOKENS = {
  input: 1200,
  output: 340,
  reasoning: 0,
  cache: { read: 5600, write: 7800 },
};

function succeededEvent(sessionID: string) {
  return { type: "session.execution.succeeded", data: { sessionID } };
}

function stepEvent(sessionID: string) {
  return { type: "session.step.ended", data: { sessionID, tokens: STEP_TOKENS } };
}

function observe(runtime: ReturnType<typeof createContextRuntime>, estimate: number) {
  const session = sessionRuntime(runtime, SESSION);
  session.lastEstimate = estimate;
  session.lastMessageCount = 12;
  session.windowTokens = 100000;
}

beforeEach(() => {
  vol.reset();
});

test("requests compaction once when a run succeeds above the floor", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);

  expect(requestCompaction).toHaveBeenCalledWith(SESSION, "task-complete");
  // The record is written by the compaction hook at execution, not here: a
  // requested but never-executed compaction leaves no record.
  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toEqual([]);
});

test("stays silent below the floor", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 31999);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);

  expect(requestCompaction).not.toHaveBeenCalled();
  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toEqual([]);
});

test("stays silent with no observed request", async () => {
  const runtime = createContextRuntime();
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);

  expect(requestCompaction).not.toHaveBeenCalled();
});

test("dedups a second success without growth", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);
  await dispatchEvent(succeededEvent(SESSION), deps, runtime);

  expect(requestCompaction).toHaveBeenCalledTimes(1);
});

test("ignores sibling and unknown events", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
  };

  await dispatchEvent(
    { type: "session.execution.failed", data: { sessionID: SESSION } },
    deps,
    runtime,
  );
  await dispatchEvent(
    { type: "session.execution.interrupted", data: { sessionID: SESSION } },
    deps,
    runtime,
  );
  await dispatchEvent({ type: "session.created", data: { sessionID: SESSION } }, deps, runtime);
  await dispatchEvent(null, deps, runtime);
  await dispatchEvent({ type: 42 }, deps, runtime);

  expect(requestCompaction).not.toHaveBeenCalled();
});

test("anchors the estimator on step tokens", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction: () => {},
  };

  await dispatchEvent(stepEvent(SESSION), deps, runtime);

  const session = sessionRuntime(runtime, SESSION);
  // Request size on v2.0.22: input plus cache read plus cache write.
  expect(session.estimator.anchoredTokens).toBe(1200 + 5600 + 7800);
  expect(session.estimator.anchoredMessageCount).toBe(12);
});

test("ignores steps with malformed tokens", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction: () => {},
  };

  await dispatchEvent(
    { type: "session.step.ended", data: { sessionID: SESSION, tokens: { input: "lots" } } },
    deps,
    runtime,
  );

  expect(sessionRuntime(runtime, SESSION).estimator.anchoredTokens).toBe(0);
});

test("subscription consumes the stream without blocking setup", async () => {
  async function* stream() {
    yield succeededEvent(SESSION);
  }
  const subscribe = vi.fn(() => stream());
  const context = { event: { subscribe } } as never;
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();

  registerCompletionTrigger(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    runtime,
  );
  expect(subscribe).toHaveBeenCalled();

  await vi.waitFor(() => expect(requestCompaction).toHaveBeenCalledWith(SESSION, "task-complete"));
});

test("requests compaction through the narrow client cast", () => {
  const compact = vi.fn(async (_input: unknown) => ({}));
  const context = { session: { compact } } as never;
  const runtime = createContextRuntime();

  requestSessionCompaction(context, runtime, SESSION, "task-complete");

  expect(compact).toHaveBeenCalledWith({ sessionID: SESSION });
  expect(runtime.pendingCauses.get(SESSION)).toBe("task-complete");
});

test("records no cause on hosts without session.compact", () => {
  const context = { session: {} } as never;
  const runtime = createContextRuntime();

  expect(() => requestSessionCompaction(context, runtime, SESSION, "ratio")).not.toThrow();
  expect(runtime.pendingCauses.has(SESSION)).toBe(false);
});

test("drops the cause when the host rejects the request", async () => {
  const compact = vi.fn(async (_input: unknown) => {
    throw new Error("denied");
  });
  const context = { session: { compact } } as never;
  const runtime = createContextRuntime();

  requestSessionCompaction(context, runtime, SESSION, "hard-cap");
  await vi.waitFor(() => expect(runtime.pendingCauses.has(SESSION)).toBe(false));
});

test("refuses the completion trigger when the Brain is unavailable", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => false,
    requestCompaction,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);

  expect(requestCompaction).not.toHaveBeenCalled();
  const receipts = await readReceipts(`${STATE}/context-log`, SESSION);
  expect(receipts.ok && receipts.value).toHaveLength(1);
  expect(receipts.ok ? receipts.value[0] : null).toMatchObject({
    kind: "refusal",
    reason: "brain-unavailable",
  });
});

test("ignores events once the setup is stale (reload without disposal)", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
    isCurrent: () => false,
  };

  await dispatchEvent(succeededEvent(SESSION), deps, runtime);
  await dispatchEvent(stepEvent(SESSION), deps, runtime);

  // Regression: a superseded setup's loop must no-op instead of firing with
  // empty dedup state — this was the task-complete double-compact loop.
  expect(requestCompaction).not.toHaveBeenCalled();
  expect(sessionRuntime(runtime, SESSION).triggerState).toEqual({ fired: {} });
});

test("drops the trigger when a reload lands mid-hydration", async () => {
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  let live = true;
  const deps = {
    config: CONFIG,
    stateDirectory: STATE,
    isBrainAvailable: () => true,
    requestCompaction,
    isCurrent: () => live,
  };

  const dispatch = dispatchEvent(succeededEvent(SESSION), deps, runtime);
  live = false; // teardown/reload lands inside the hydration await
  await dispatch;

  // Regression: the entry check alone is not enough — recording the fired
  // trigger without dispatching the compaction would leave a phantom dedup
  // entry (with no receipt anywhere) that silently drops the next reload's
  // legitimate compaction.
  expect(requestCompaction).not.toHaveBeenCalled();
  expect(sessionRuntime(runtime, SESSION).triggerState).toEqual({ fired: {} });
});

test("stops consuming once the teardown signal aborts", async () => {
  async function* stream() {
    yield succeededEvent(SESSION);
    yield succeededEvent(SESSION);
  }
  const subscribe = vi.fn(() => stream());
  const context = { event: { subscribe } } as never;
  const runtime = createContextRuntime();
  observe(runtime, 100000);
  const requestCompaction = vi.fn();
  const controller = new AbortController();
  controller.abort();

  registerCompletionTrigger(
    context,
    { config: CONFIG, stateDirectory: STATE, isBrainAvailable: () => true, requestCompaction },
    runtime,
    { signal: controller.signal },
  );

  expect(subscribe).toHaveBeenCalledWith({ signal: controller.signal });
  // The aborted stream ends without dispatching: poll for the quiet state
  // with the file's vi.waitFor idiom instead of a wall-clock sleep.
  await vi.waitFor(() => expect(requestCompaction).not.toHaveBeenCalled());
});
