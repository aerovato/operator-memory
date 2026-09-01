import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadMemorySnapshot, type MemoryStatusSnapshot } from "@aerovato/operator-core/memory/load";
import { Plugin } from "@opencode-ai/plugin";

import packageJson from "../package.json" with { type: "json" };
import { registerCommands } from "./commands.ts";
import { loadPreamble } from "./preamble.ts";
import {
  OperatorNotifications,
  type OperatorStatus,
  type OperatorToast,
  type PartitionStatus,
} from "./notifications.ts";
import { startAutoUpdate } from "./update.ts";

let helperUpdateStarted = false;

const OperatorPlugin = Plugin.define({
  id: "aerovato.operator-memory",
  async setup(context) {
    const cache = new Map<string, ReturnType<typeof loadPreamble>>();
    const recoveryNotices = new Set<string>();
    let status: Promise<OperatorStatus> | null = null;
    const notifications = await context.rpc.register(OperatorNotifications, {
      status: async input => {
        const refresh =
          input !== null
          && typeof input === "object"
          && "refresh" in input
          && input.refresh === true;
        if (status === null || refresh) {
          status = loadStatus(context.location.directory);
        }
        return status;
      },
    });
    const showToast = (toast: OperatorToast) => notifications.events.emit("toast", toast);
    startHelperUpdate();
    void startAutoUpdate(showToast).catch(() => undefined);
    await registerCommands(context);
    await context.session.hook("context", async event => {
      const result = await loadPreamble({
        sessionID: event.sessionID,
        projectDirectory: context.location.directory,
        homeDirectory: homedir(),
        cache,
      });
      if (!result.ok) {
        const cause = result.error.cause instanceof Error ? ` ${result.error.cause.message}` : "";
        await showToast({
          title: "Operator Error",
          message: `${result.error.message}${cause}`,
          variant: "error",
        }).catch(() => undefined);
        throw new Error(result.error.message, { cause: result.error.cause });
      }
      if (!result.value.loaded && !recoveryNotices.has(event.sessionID)) {
        recoveryNotices.add(event.sessionID);
        await showToast({
          title: "Operator Error",
          message: "Operator memory failed to load. The agent is attempting to recover.",
          variant: "error",
        }).catch(() => undefined);
      }
      event.system.push({ type: "text", text: result.value.content });
    });
  },
});

export default OperatorPlugin;

async function loadStatus(projectDirectory: string): Promise<OperatorStatus> {
  const snapshot = await loadMemorySnapshot(projectDirectory, homedir(), false);
  return {
    detail: installationDetail(import.meta.url),
    user: partitionStatus(snapshot.user),
    private: partitionStatus(snapshot.private),
    shared: partitionStatus(snapshot.shared),
  };
}

function partitionStatus(
  partition: MemoryStatusSnapshot[keyof MemoryStatusSnapshot],
): PartitionStatus {
  if (!partition.ok) return "error";
  return partition.value.exists ? "loaded" : "uninitialized";
}

function installationDetail(moduleUrl: string): string {
  const packageDirectory = dirname(dirname(fileURLToPath(moduleUrl)));
  return packageDirectory.includes(
    `${process.platform === "win32" ? "\\" : "/"}node_modules${process.platform === "win32" ? "\\" : "/"}`,
  )
    ? `v${packageJson.version}`
    : "Local Build";
}

function startHelperUpdate(): void {
  if (helperUpdateStarted) return;
  helperUpdateStarted = true;

  const environment = { ...process.env };
  delete environment.OPERATOR_HELPER_SKIP_UPDATE;
  try {
    const child = spawn("operator-helper", ["version"], {
      detached: true,
      env: environment,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // The installed plugin remains usable when Helper is unavailable.
  }
}
