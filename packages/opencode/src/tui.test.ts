import type { TuiPluginApi, TuiSlotPlugin } from "@opencode-ai/plugin/tui";
import { beforeEach, expect, test, vi } from "vitest";

const { loadMemorySnapshot } = vi.hoisted(() => ({ loadMemorySnapshot: vi.fn() }));

vi.mock("@aerovato/operator-core/memory/load", () => ({ loadMemorySnapshot }));

import OperatorTuiPlugin, { readyLabel } from "./tui.tsx";

beforeEach(() => {
  loadMemorySnapshot.mockReset();
  loadMemorySnapshot.mockResolvedValue({
    shared: { ok: true, value: { exists: true } },
    user: { ok: true, value: { exists: true } },
    private: { ok: true, value: { exists: true } },
  });
});

test("registers the home and sidebar status slots", async () => {
  const registered: TuiSlotPlugin[] = [];
  const api = createApi(registered, () => undefined);

  await OperatorTuiPlugin.tui(api, undefined, createMeta());

  expect(registered).toHaveLength(1);
  expect(Object.keys(registered[0]?.slots ?? {})).toEqual(["home_bottom", "sidebar_content"]);
});

test("labels local plugin installations", () => {
  expect(readyLabel({ source: "npm", spec: "@aerovato/operator-opencode@latest" })).toBe(
    "Operator Ready",
  );
  expect(
    readyLabel({ source: "npm", spec: "@aerovato/operator-opencode@latest", version: "1.2.3" }),
  ).toBe("Operator Ready (v1.2.3)");
  expect(
    readyLabel({
      source: "npm",
      spec: "@aerovato/operator-opencode@file:///project/packages/opencode",
      version: "1.2.3",
    }),
  ).toBe("Operator Ready (Local Build)");
  expect(readyLabel({ source: "file", spec: "file:///project/dist/tui.js" })).toBe(
    "Operator Ready (Local Build)",
  );
});

test("refreshes status after a top-level session transitions to idle", async () => {
  const handlers: Array<(event: SessionStatusEvent) => void> = [];
  const api = createApi([], handler => handlers.push(handler));
  await OperatorTuiPlugin.tui(api, undefined, createMeta());

  handlers[0]?.({
    type: "session.status",
    properties: { sessionID: "session", status: { type: "busy" } },
  });
  handlers[0]?.({
    type: "session.status",
    properties: { sessionID: "session", status: { type: "idle" } },
  });

  await vi.waitFor(() => {
    expect(loadMemorySnapshot).toHaveBeenCalledOnce();
  });
  expect(loadMemorySnapshot).toHaveBeenCalledWith("/project", expect.any(String), false);
});

type SessionStatusEvent = {
  readonly type: "session.status";
  readonly properties: {
    readonly sessionID: string;
    readonly status: { readonly type: "busy" | "idle" };
  };
};

function createApi(
  registered: TuiSlotPlugin[],
  registerEvent: (handler: (event: SessionStatusEvent) => void) => void,
): TuiPluginApi {
  return {
    event: {
      on(_type: string, handler: (event: SessionStatusEvent) => void) {
        registerEvent(handler);
        return () => undefined;
      },
    },
    slots: {
      register(plugin: TuiSlotPlugin) {
        registered.push(plugin);
        return "operator";
      },
    },
    state: {
      path: { state: "", config: "", worktree: "/project", directory: "/project" },
      session: {
        get() {
          return { directory: "/project" };
        },
      },
    },
    ui: { toast: vi.fn() },
  } as unknown as TuiPluginApi;
}

function createMeta() {
  return {
    id: "operator",
    source: "npm" as const,
    spec: "operator",
    target: "operator",
    first_time: 0,
    last_time: 0,
    time_changed: 0,
    load_count: 1,
    fingerprint: "operator",
    state: "same" as const,
  };
}
