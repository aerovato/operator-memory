import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadMemorySnapshot, type MemoryStatusSnapshot } from "@aerovato/operator-core/memory/load";
import type { TriggerKind } from "@aerovato/operator-core/context/triggers";
import { Plugin } from "@opencode/plugin";
import { pluginId } from "./id.ts";

import packageJson from "../package.json" with { type: "json" };
import { registerCommands } from "./commands.ts";
import { DEFAULT_BRAIN_PATHS, registerCompactionHook } from "./compaction.ts";
import { registerContextHook } from "./context.ts";
import { parseContextManagementConfig } from "./context-config.ts";
import { registerCompletionTrigger, requestSessionCompaction } from "./events.ts";
import { loadPreamble } from "./preamble.ts";
import { createContextRuntime } from "./runtime.ts";
import { registerReadOmittedTool } from "./tool.ts";
import {
  OperatorNotifications,
  type OperatorStatus,
  type OperatorToast,
  type PartitionStatus,
} from "./notifications.ts";

const OperatorPlugin = Plugin.define({
  id: pluginId,
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
    await registerCommands(context);
    // Brain availability per session, from preamble loads. Context management
    // gates on it: the feature stays off without the Brain.
    const brainAvailable = new Map<string, boolean>();
    await context.session.hook("context", async event => {
      const result = await loadPreamble({
        sessionID: event.sessionID,
        projectDirectory: context.location.directory,
        homeDirectory: homedir(),
        cache,
      });
      brainAvailable.set(
        event.sessionID,
        result.ok ? result.value.loaded && result.value.initialized : false,
      );
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

    // Context management is opt-in and off by default; vanilla Operator
    // behavior is unchanged when disabled.
    const parsed = parseContextManagementConfig(context.options);
    if (!parsed.ok) {
      await showToast({
        title: "Operator Error",
        message: parsed.error.message,
        variant: "error",
      }).catch(() => undefined);
    } else if (parsed.value.enabled) {
      const config = parsed.value;
      const stateDirectory = join(homedir(), ".operator", "state");
      const runtime = createContextRuntime();
      // The preamble hook above must stay registered first: it populates
      // brainAvailable, which these hooks read through isBrainAvailable.
      // Unknown sessions default to unavailable (fail closed).
      const isBrainAvailable = (sessionID: string) => brainAvailable.get(sessionID) === true;
      const requestCompaction = (sessionID: string, cause: TriggerKind) => {
        requestSessionCompaction(context, runtime, sessionID, cause);
      };
      registerContextHook(
        context,
        { config, stateDirectory, requestCompaction, isBrainAvailable },
        runtime,
      );
      registerCompactionHook(
        context,
        { config, stateDirectory, brainPaths: DEFAULT_BRAIN_PATHS, isBrainAvailable },
        runtime,
      );
      registerCompletionTrigger(
        context,
        { config, stateDirectory, requestCompaction, isBrainAvailable },
        runtime,
      );
      await registerReadOmittedTool(context, { stateDirectory });
    }
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
