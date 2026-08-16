import { homedir } from "node:os";

import type { MemoryStatusSnapshot } from "@aerovato/operator-core/memory/load";
import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginMeta,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui";
import { createEffect, Show } from "solid-js";
import { createStore } from "solid-js/store";

type PartitionStatus = MemoryStatusSnapshot[keyof MemoryStatusSnapshot];

const PACKAGE_NAME = "@aerovato/operator-opencode";

const tui: TuiPlugin = async (api, _options, meta) => {
  const [snapshots, setSnapshots] = createStore<Record<string, MemoryStatusSnapshot>>({});
  const activeSessions = new Set<string>();
  const pending = new Map<string, Promise<void>>();

  const refresh = (directory: string): void => {
    if (pending.has(directory)) {
      return;
    }

    const operation = loadMemorySnapshot(directory, homedir(), false)
      .then(snapshot => {
        setSnapshots(directory, snapshot);
      })
      .catch(() => undefined)
      .finally(() => {
        pending.delete(directory);
      });
    pending.set(directory, operation);
  };

  api.event.on("session.status", event => {
    const sessionID = event.properties.sessionID;
    const session = api.state.session.get(sessionID);
    if (session?.parentID !== undefined) {
      return;
    }

    if (event.properties.status.type !== "idle") {
      activeSessions.add(sessionID);
      return;
    }

    if (!activeSessions.delete(sessionID)) {
      return;
    }

    // Is idle + active = refresh
    const directory = session?.directory ?? api.state.path.directory;
    if (directory.length > 0) {
      refresh(directory);
    }
  });

  api.slots.register({
    order: 100,
    slots: {
      home_bottom() {
        return (
          <box alignItems="center" paddingTop={1}>
            <text fg={api.theme.current.text}>
              <span style={{ fg: api.theme.current.success }}>•</span> <b>{readyLabel(meta)}</b>
            </text>
          </box>
        );
      },
      sidebar_content(_context, props) {
        const directory = () =>
          api.state.session.get(props.session_id)?.directory ?? api.state.path.directory;
        const hasError = () => {
          const snapshot = snapshots[directory()];
          return snapshot !== undefined && Object.values(snapshot).some(status => !status.ok);
        };
        createEffect(() => {
          const current = directory();
          if (current.length > 0 && snapshots[current] === undefined) {
            refresh(current);
          }
        });

        return (
          <box gap={0}>
            <text fg={api.theme.current.text}>
              <b>Operator Status</b>
            </text>
            <StatusRow api={api} label="User" status={snapshots[directory()]?.user} />
            <StatusRow api={api} label="Private" status={snapshots[directory()]?.private} />
            <StatusRow api={api} label="Shared" status={snapshots[directory()]?.shared} />
            <Show when={hasError()}>
              <text fg={api.theme.current.warning}>Run /operator:repair to repair</text>
            </Show>
          </box>
        );
      },
    },
  });
};

export function readyLabel(meta: Pick<TuiPluginMeta, "source" | "spec" | "version">): string {
  if (meta.source === "file" || meta.spec.startsWith(`${PACKAGE_NAME}@file:`)) {
    return "Operator Ready (Local Build)";
  }
  if (meta.version !== undefined && meta.version.length > 0) {
    return `Operator Ready (v${meta.version})`;
  }
  return "Operator Ready";
}

function StatusRow(props: {
  readonly api: TuiPluginApi;
  readonly label: string;
  readonly status: PartitionStatus | undefined;
}) {
  const display = () => {
    if (props.status === undefined) {
      return { color: props.api.theme.current.textMuted, label: "Checking" };
    }
    if (!props.status.ok) {
      return { color: props.api.theme.current.error, label: "Error" };
    }
    return props.status.value.exists
      ? { color: props.api.theme.current.success, label: "Loaded" }
      : { color: props.api.theme.current.warning, label: "Uninitialized" };
  };

  return (
    <text fg={props.api.theme.current.text}>
      <span style={{ fg: display().color }}>•</span> {props.label}{" "}
      <span style={{ fg: props.api.theme.current.textMuted }}>{display().label}</span>
    </text>
  );
}

const OperatorTuiPlugin: TuiPluginModule = {
  id: PACKAGE_NAME,
  tui,
};

export default OperatorTuiPlugin;
