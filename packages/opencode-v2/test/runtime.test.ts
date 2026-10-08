import { appendReceipt } from "@aerovato/operator-core/context/receipts";
import { vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import {
  createContextRuntime,
  ensureSessionHydrated,
  MAX_WINDOW_LOOKUP_ATTEMPTS,
  resolveWindowTokens,
  sessionRuntime,
  sharedContextRuntime,
} from "../src/runtime.ts";

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

const STATE = "/state";
const SESSION = "ses_test";

beforeEach(() => {
  vol.reset();
});

test("seeds trigger state from trim and compact receipts, skipping manual", async () => {
  await appendReceipt(`${STATE}/context-log`, SESSION, {
    kind: "trim",
    trigger: "hard-cap",
    at: "2026-10-04T12:00:00Z",
    tokens: 260000,
    removed: 8000,
    omissions: 1,
  });
  await appendReceipt(`${STATE}/context-log`, SESSION, {
    kind: "compact",
    trigger: "task-complete",
    at: "2026-10-04T12:30:00Z",
    summarized: 100000,
  });
  await appendReceipt(`${STATE}/context-log`, SESSION, {
    kind: "compact",
    trigger: "manual",
    at: "2026-10-04T12:31:00Z",
    summarized: 90000,
  });

  const runtime = createContextRuntime();
  await ensureSessionHydrated(STATE, runtime, SESSION);

  expect(sessionRuntime(runtime, SESSION).triggerState).toEqual({
    fired: { "hard-cap": 260000, "task-complete": 100000 },
  });
});

test("records prior refusals so they are not logged twice", async () => {
  await appendReceipt(`${STATE}/context-log`, SESSION, {
    kind: "refusal",
    at: "2026-10-04T13:00:00Z",
    reason: "brain-unavailable",
  });

  const runtime = createContextRuntime();
  await ensureSessionHydrated(STATE, runtime, SESSION);

  expect(runtime.refusals.has(SESSION)).toBe(true);
});

test("second hydration does not overwrite live state", async () => {
  const runtime = createContextRuntime();
  await ensureSessionHydrated(STATE, runtime, SESSION);

  const session = sessionRuntime(runtime, SESSION);
  session.triggerState = { fired: { ratio: 50000 } };
  await ensureSessionHydrated(STATE, runtime, SESSION);

  expect(session.triggerState).toEqual({ fired: { ratio: 50000 } });
});

test("missing log seeds nothing and never throws", async () => {
  const runtime = createContextRuntime();
  await ensureSessionHydrated(STATE, runtime, SESSION);

  expect(sessionRuntime(runtime, SESSION).triggerState).toEqual({ fired: {} });
  expect(runtime.refusals.has(SESSION)).toBe(false);
});

test("merges seeded state under live state, live winning ties", async () => {
  await appendReceipt(`${STATE}/context-log`, SESSION, {
    kind: "trim",
    trigger: "hard-cap",
    at: "2026-10-04T12:00:00Z",
    tokens: 260000,
    removed: 8000,
    omissions: 1,
  });

  const runtime = createContextRuntime();
  const session = sessionRuntime(runtime, SESSION);
  session.triggerState = { fired: { ratio: 50000 } };
  await ensureSessionHydrated(STATE, runtime, SESSION);

  expect(session.triggerState).toEqual({ fired: { "hard-cap": 260000, ratio: 50000 } });
  expect(runtime.hydrated.has(SESSION)).toBe(true);
});

const MODEL_A = { id: "anthropic/claude-sonnet-4", providerID: "anthropic" };
const MODEL_B = { id: "openai/gpt-5", providerID: "openai" };

function listContext(entries: { id: string; limit: { context: number } }[]) {
  return { model: { list: vi.fn(async () => ({ data: entries })) } } as never;
}

test("resolves the window once and caches it per model", async () => {
  const context = listContext([{ id: MODEL_A.id, limit: { context: 200000 } }]);
  const runtime = createContextRuntime();
  const session = sessionRuntime(runtime, "ses_a");

  expect(await resolveWindowTokens(context, session, MODEL_A)).toBe(200000);
  expect(await resolveWindowTokens(context, session, MODEL_A)).toBe(200000);
  expect(context.model.list).toHaveBeenCalledTimes(1);
});

test("re-resolves when the model changes mid-session", async () => {
  const context = listContext([
    { id: MODEL_A.id, limit: { context: 200000 } },
    { id: MODEL_B.id, limit: { context: 400000 } },
  ]);
  const runtime = createContextRuntime();
  const session = sessionRuntime(runtime, "ses_a");

  expect(await resolveWindowTokens(context, session, MODEL_A)).toBe(200000);
  expect(await resolveWindowTokens(context, session, MODEL_B)).toBe(400000);
  expect(context.model.list).toHaveBeenCalledTimes(2);
});

test("stops retrying an unlisted model after a bounded number of attempts", async () => {
  const context = listContext([]);
  const runtime = createContextRuntime();
  const session = sessionRuntime(runtime, "ses_a");

  for (let attempt = 0; attempt < MAX_WINDOW_LOOKUP_ATTEMPTS + 2; attempt++) {
    expect(await resolveWindowTokens(context, session, MODEL_A)).toBeNull();
  }
  expect(context.model.list).toHaveBeenCalledTimes(MAX_WINDOW_LOOKUP_ATTEMPTS);
});

test("a later success resets the failure count", async () => {
  const list = vi.fn(async () => ({ data: [] as { id: string; limit: { context: number } }[] }));
  const context = { model: { list } } as never;
  const runtime = createContextRuntime();
  const session = sessionRuntime(runtime, "ses_a");

  await resolveWindowTokens(context, session, MODEL_A);
  expect(session.windowFailures).toBe(1);

  list.mockResolvedValueOnce({ data: [{ id: MODEL_A.id, limit: { context: 200000 } }] });
  expect(await resolveWindowTokens(context, session, MODEL_A)).toBe(200000);
  expect(session.windowFailures).toBe(0);
});

test("shared runtime preserves fired state across reloads", async () => {
  const first = sharedContextRuntime();
  const second = sharedContextRuntime();
  expect(second).toBe(first);

  const session = sessionRuntime(first, "ses_reload_probe");
  session.triggerState = { fired: { "task-complete": 100000 } };
  // A reloaded setup gets the same instance: the next terminal signal with
  // the same estimate dedups instead of firing a second compaction.
  expect(sessionRuntime(second, "ses_reload_probe").triggerState).toEqual({
    fired: { "task-complete": 100000 },
  });
  // Clean up so later tests in this worker see a fresh probe entry.
  session.triggerState = { fired: {} };
});
