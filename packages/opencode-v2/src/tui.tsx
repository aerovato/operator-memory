import { Plugin } from "@opencode-ai/plugin/tui";
import type { Context } from "@opencode-ai/plugin/tui/context";
import { createEffect, Show } from "solid-js";
import { createStore } from "solid-js/store";

import packageJson from "../package.json" with { type: "json" };
import {
  OperatorNotifications,
  type OperatorStatus,
  type OperatorToast,
  type PartitionStatus,
} from "./notifications.ts";

type Location = Context["location"];
type StatusState =
  | { readonly connection: "connecting" | "unavailable"; readonly detail: string }
  | ({ readonly connection: "ready" } & OperatorStatus);

const OperatorTuiPlugin = Plugin.define({
  id: "aerovato.operator-memory",
  setup(context) {
    const [statuses, setStatuses] = createStore<Record<string, StatusState>>({});
    const activeSessions = new Set<string>();
    const pending = new Map<string, Promise<void>>();
    const client = context.client.rpc(OperatorNotifications);
    const status = (location: Location) =>
      statuses[locationKey(location)] ?? {
        connection: "connecting",
        detail: `v${packageJson.version}`,
      };
    const refresh = (location: Location, force: boolean): void => {
      const key = locationKey(location);
      if (pending.has(key)) return;
      if (statuses[key]?.connection !== "ready") {
        setStatuses(key, {
          connection: "connecting",
          detail: statuses[key]?.detail ?? `v${packageJson.version}`,
        });
      }
      const operation = client
        .status({ refresh: force }, location === undefined ? undefined : { location })
        .then(value => {
          const current = parseStatus(value);
          setStatuses(
            key,
            current === null
              ? {
                  connection: "unavailable",
                  detail: statuses[key]?.detail ?? `v${packageJson.version}`,
                }
              : { connection: "ready", ...current },
          );
        })
        .catch(() => {
          setStatuses(key, {
            connection: "unavailable",
            detail: statuses[key]?.detail ?? `v${packageJson.version}`,
          });
        })
        .finally(() => pending.delete(key));
      pending.set(key, operation);
    };

    refresh(context.location, false);
    const cleanups = [
      context.data.listen(event => {
        if (event.details.type !== "rpc.aerovato.operator-memory.toast") return;
        const toast = parseToast(event.details.data);
        if (toast === null) return;
        context.ui.toast.show({ ...toast, duration: 10_000 });
      }),
      context.data.on("server.connected", () => refresh(context.location, true)),
      context.data.on("session.status", event => {
        const session = context.data.session.get(event.data.sessionID);
        if (session?.parentID !== undefined) return;
        if (event.data.status.type !== "idle") {
          activeSessions.add(event.data.sessionID);
          return;
        }
        if (!activeSessions.delete(event.data.sessionID)) return;
        refresh(session?.location ?? context.location, true);
      }),
      context.ui.slot({
        append: "home.footer",
        render: () => <ReadyIndicator context={context} status={() => status(context.location)} />,
      }),
      context.ui.slot({
        append: "sidebar.content",
        render: input => {
          const location = () =>
            context.data.session.get(input.sessionID)?.location ?? context.location;
          createEffect(() => refresh(location(), false));
          return <PartitionStatusView context={context} status={() => status(location())} />;
        },
      }),
    ];
    return () =>
      cleanups.forEach(cleanup => {
        cleanup();
      });
  },
});

export default OperatorTuiPlugin;

export function statusLabel(status: StatusState): string {
  const suffix = status.detail.length > 0 ? ` (${status.detail})` : "";
  if (status.connection === "connecting") return `Operator Connecting...${suffix}`;
  if (status.connection === "unavailable") return `Operator Unavailable${suffix}`;
  return `Operator Ready${suffix}`;
}

function ReadyIndicator(props: { readonly context: Context; readonly status: () => StatusState }) {
  const color = () => {
    if (props.status().connection === "ready")
      return props.context.theme.text.feedback.success.default;
    if (props.status().connection === "unavailable")
      return props.context.theme.text.feedback.error.default;
    return props.context.theme.text.subdued;
  };
  return (
    <box flexShrink={0}>
      <text fg={props.context.theme.text.default}>
        <span style={{ fg: color() }}>•</span> <b>{statusLabel(props.status())}</b>
      </text>
    </box>
  );
}

function PartitionStatusView(props: {
  readonly context: Context;
  readonly status: () => StatusState;
}) {
  const hasError = () => {
    const status = props.status();
    return (
      status.connection === "unavailable"
      || (status.connection === "ready"
        && [status.user, status.private, status.shared].includes("error"))
    );
  };
  return (
    <box gap={0}>
      <text fg={props.context.theme.text.default}>
        <b>Operator Status</b>
      </text>
      <StatusRow context={props.context} label="User" status={partition(props.status(), "user")} />
      <StatusRow
        context={props.context}
        label="Private"
        status={partition(props.status(), "private")}
      />
      <StatusRow
        context={props.context}
        label="Shared"
        status={partition(props.status(), "shared")}
      />
      <Show when={hasError()}>
        <text fg={props.context.theme.text.feedback.warning.default}>
          Run /operator:repair to repair
        </text>
      </Show>
    </box>
  );
}

function StatusRow(props: {
  readonly context: Context;
  readonly label: string;
  readonly status: PartitionStatus | "checking";
}) {
  const display = () => {
    if (props.status === "checking") {
      return { color: props.context.theme.text.subdued, label: "Checking" };
    }
    if (props.status === "error") {
      return { color: props.context.theme.text.feedback.error.default, label: "Error" };
    }
    return props.status === "loaded"
      ? { color: props.context.theme.text.feedback.success.default, label: "Loaded" }
      : { color: props.context.theme.text.feedback.warning.default, label: "Uninitialized" };
  };
  return (
    <text fg={props.context.theme.text.default}>
      <span style={{ fg: display().color }}>•</span> {props.label}{" "}
      <span style={{ fg: props.context.theme.text.subdued }}>{display().label}</span>
    </text>
  );
}

function partition(
  status: StatusState,
  name: "user" | "private" | "shared",
): PartitionStatus | "checking" {
  return status.connection === "ready" ? status[name] : "checking";
}

function locationKey(location: Location): string {
  return JSON.stringify(location ?? null);
}

function parseStatus(value: unknown): OperatorStatus | null {
  if (value === null || typeof value !== "object") return null;
  if (!("detail" in value) || typeof value.detail !== "string") return null;
  if (!("user" in value) || !isPartitionStatus(value.user)) return null;
  if (!("private" in value) || !isPartitionStatus(value.private)) return null;
  if (!("shared" in value) || !isPartitionStatus(value.shared)) return null;
  return { detail: value.detail, user: value.user, private: value.private, shared: value.shared };
}

function isPartitionStatus(value: unknown): value is PartitionStatus {
  return value === "loaded" || value === "uninitialized" || value === "error";
}

function parseToast(value: unknown): OperatorToast | null {
  if (value === null || typeof value !== "object") return null;
  if (!("title" in value) || typeof value.title !== "string") return null;
  if (!("message" in value) || typeof value.message !== "string") return null;
  if (!("variant" in value) || !isVariant(value.variant)) return null;
  return { title: value.title, message: value.message, variant: value.variant };
}

function isVariant(value: unknown): value is OperatorToast["variant"] {
  return value === "info" || value === "success" || value === "warning" || value === "error";
}
