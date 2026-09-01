import type { Context, SlotClaim } from "@opencode-ai/plugin/tui/context";
import { expect, test, vi } from "vitest";

import OperatorTuiPlugin, { statusLabel } from "../src/tui.tsx";

test("queries server status and registers parity slots", async () => {
  const claims: SlotClaim[] = [];
  const status = vi.fn(() =>
    Promise.resolve({
      detail: "v1.2.3",
      user: "loaded",
      private: "loaded",
      shared: "uninitialized",
    }),
  );
  const context = createContext({
    status,
    slot: claim => {
      claims.push(claim);
      return vi.fn();
    },
  });

  OperatorTuiPlugin.setup(context);

  await vi.waitFor(() => expect(status).toHaveBeenCalledWith({ refresh: false }, undefined));
  expect(claims.map(claim => "append" in claim && claim.append)).toEqual([
    "home.footer",
    "sidebar.content",
  ]);
});

test("shows server notification events as toasts", () => {
  const show = vi.fn();
  const context = createContext({
    show,
    listen: callback => {
      callback({
        details: {
          type: "rpc.aerovato.operator-memory.toast",
          data: { title: "Operator Error", message: "failed", variant: "error" },
        },
      });
      return vi.fn();
    },
  });

  const cleanup = OperatorTuiPlugin.setup(context);

  expect(show).toHaveBeenCalledWith({
    title: "Operator Error",
    message: "failed",
    variant: "error",
    duration: 10_000,
  });
  expect(cleanup).toEqual(expect.any(Function));
});

test("labels connecting, ready, and unavailable states", () => {
  expect(statusLabel({ connection: "connecting", detail: "v1.2.3" })).toBe(
    "Operator Connecting... (v1.2.3)",
  );
  expect(
    statusLabel({
      connection: "ready",
      detail: "Local Build",
      user: "loaded",
      private: "loaded",
      shared: "loaded",
    }),
  ).toBe("Operator Ready (Local Build)");
  expect(statusLabel({ connection: "unavailable", detail: "v1.2.3" })).toBe(
    "Operator Unavailable (v1.2.3)",
  );
});

test("refreshes status after a top-level session becomes idle", async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const status = vi.fn(() =>
    Promise.resolve({
      detail: "v1.2.3",
      user: "loaded",
      private: "loaded",
      shared: "loaded",
    }),
  );
  const context = createContext({
    on: (type, callback) => {
      handlers.set(type, callback);
      return vi.fn();
    },
    session: { parentID: undefined, location: { directory: "/project" } },
    status,
  });
  OperatorTuiPlugin.setup(context);
  await vi.waitFor(() => expect(status).toHaveBeenCalledTimes(1));

  handlers.get("session.status")?.({
    data: { sessionID: "session-one", status: { type: "busy" } },
  });
  handlers.get("session.status")?.({
    data: { sessionID: "session-one", status: { type: "idle" } },
  });

  await vi.waitFor(() => expect(status).toHaveBeenCalledTimes(2));
  expect(status).toHaveBeenLastCalledWith(
    { refresh: true },
    { location: { directory: "/project" } },
  );
});

function createContext(overrides: {
  readonly listen?: (
    callback: (event: { details: { type: string; data: unknown } }) => void,
  ) => () => void;
  readonly show?: (input: unknown) => void;
  readonly on?: (type: string, callback: (event: unknown) => void) => () => void;
  readonly session?: {
    readonly parentID: string | undefined;
    readonly location: { readonly directory: string };
  };
  readonly slot?: (claim: SlotClaim) => () => void;
  readonly status?: (input: unknown, options: unknown) => Promise<unknown>;
}): Context {
  return {
    client: {
      rpc: () => ({ status: overrides.status ?? vi.fn(() => new Promise(() => undefined)) }),
    },
    data: {
      listen: overrides.listen ?? vi.fn(() => vi.fn()),
      on: overrides.on ?? vi.fn(() => vi.fn()),
      session: { get: vi.fn(() => overrides.session) },
    },
    location: undefined,
    theme: {
      text: {
        default: "white",
        subdued: "gray",
        feedback: {
          error: { default: "red" },
          success: { default: "green" },
          warning: { default: "yellow" },
        },
      },
    },
    ui: {
      slot: overrides.slot ?? vi.fn(() => vi.fn()),
      toast: { show: overrides.show ?? vi.fn() },
    },
  } as unknown as Context;
}
