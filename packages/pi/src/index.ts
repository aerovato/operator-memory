import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import { renderPreamble } from "@aerovato/operator-core/preamble";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import packageJson from "../package.json" with { type: "json" };
import { registerCommands } from "./commands.ts";

export default function operatorPi(pi: ExtensionAPI): void {
  let message: Awaited<ReturnType<typeof renderMessage>> | null = null;
  let pending: Promise<Awaited<ReturnType<typeof renderMessage>>> | null = null;
  let recoveryNoticeShown = false;
  let failureNoticeShown = false;
  const detail = installationDetail(import.meta.url);

  startHelperUpdate();
  registerCommands(pi);

  pi.on("context", async (event, context) => {
    try {
      pending ??= renderMessage(context.cwd);
      message ??= await pending;
      if (!message.loaded && context.hasUI && !recoveryNoticeShown) {
        recoveryNoticeShown = true;
        context.ui.setStatus("__operator", context.ui.theme.fg("error", "· Operator Unavailable"));
        context.ui.notify(
          "Operator memory failed to load. The agent is attempting to recover.",
          "error",
        );
      }
      return { messages: [message.value, ...event.messages] };
    } catch (cause) {
      context.abort();
      if (context.hasUI && !failureNoticeShown) {
        failureNoticeShown = true;
        const causeMessage = cause instanceof Error ? cause.message : "Preamble Error";
        context.ui.setStatus("__operator", context.ui.theme.fg("error", "· Operator Error"));
        context.ui.notify(
          `Operator failed to create the session preamble. ${causeMessage}`,
          "error",
        );
      }
      return { messages: event.messages };
    }
  });

  pi.on("session_start", (_event, context) => {
    if (context.hasUI) {
      context.ui.setStatus("__operator", `\u001B[35m· Operator Active (${detail})\u001B[39m`);
    }
  });

  pi.on("session_shutdown", (_event, context) => {
    if (context.hasUI) context.ui.setStatus("__operator", undefined);
    message = null;
    pending = null;
    recoveryNoticeShown = false;
    failureNoticeShown = false;
  });
}

function installationDetail(moduleUrl: string): string {
  const packageDirectory = dirname(dirname(fileURLToPath(moduleUrl)));
  const separator = process.platform === "win32" ? "\\" : "/";
  return packageDirectory.includes(`${separator}node_modules${separator}`)
    ? `v${packageJson.version}`
    : "Local Build";
}

function startHelperUpdate(): void {
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

async function renderMessage(projectDirectory: string) {
  const preamble = renderPreamble(await loadMemorySnapshot(projectDirectory, homedir(), true));
  return {
    loaded: preamble.loaded,
    value: {
      role: "user" as const,
      content: [{ type: "text" as const, text: preamble.content }],
      timestamp: Date.now(),
    },
  };
}
