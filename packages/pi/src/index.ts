import { spawn } from "node:child_process";
import { homedir } from "node:os";

import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import { renderPreamble } from "@aerovato/operator-core/preamble";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerCommands } from "./commands.ts";

export default function operatorPi(pi: ExtensionAPI): void {
  let message: Awaited<ReturnType<typeof renderMessage>> | null = null;
  let pending: Promise<Awaited<ReturnType<typeof renderMessage>>> | null = null;
  let recoveryNoticeShown = false;
  let failureNoticeShown = false;

  startHelperUpdate();
  registerCommands(pi);

  pi.on("context", async (event, context) => {
    try {
      pending ??= renderMessage(context.cwd);
      message ??= await pending;
      if (!message.loaded && context.hasUI && !recoveryNoticeShown) {
        recoveryNoticeShown = true;
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
        const detail = cause instanceof Error ? ` ${cause.message}` : "";
        context.ui.notify(`Operator failed to create the session preamble.${detail}`, "error");
      }
      return { messages: event.messages };
    }
  });

  pi.on("session_shutdown", () => {
    message = null;
    pending = null;
    recoveryNoticeShown = false;
    failureNoticeShown = false;
  });
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
