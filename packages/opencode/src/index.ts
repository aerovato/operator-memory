import { homedir } from "node:os";

import type { Hooks, Plugin } from "@opencode-ai/plugin";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";

import { createV2Client } from "./client.ts";
import { registerCommands } from "./commands.ts";
import { loadPreamble } from "./preamble.ts";
import { startAutoUpdate } from "./update.ts";

type PreambleHook = NonNullable<Hooks["experimental.chat.messages.transform"]>;
type TransformMessage = Parameters<PreambleHook>[1]["messages"][number];

const OperatorPlugin: Plugin = async input => {
  const client = createV2Client(input.client);
  const homeDirectory = homedir();
  const preambleCache = new Map<string, ReturnType<typeof loadPreamble>>();
  const recoveryNotices = new Set<string>();
  void startAutoUpdate(client).catch(() => undefined);

  return {
    config: async config => {
      registerCommands(config);
    },
    "experimental.chat.messages.transform": async (_hookInput, output) => {
      const sessionID = sessionIDFrom(output.messages);
      if (sessionID === null) {
        const message = "Operator could not determine the session for preamble injection.";
        await showErrorToast(client, "Operator Error", message);
        throw new Error(message);
      }

      const result = await loadPreamble({
        sessionID,
        projectDirectory: input.directory,
        homeDirectory,
        cache: preambleCache,
      });

      if (!result.ok) {
        const cause = result.error.cause instanceof Error ? ` ${result.error.cause.message}` : "";
        await showErrorToast(client, "Operator Error", `${result.error.message}${cause}`);
        throw new Error(result.error.message, { cause: result.error.cause });
      }

      if (!result.value.loaded && !recoveryNotices.has(sessionID)) {
        recoveryNotices.add(sessionID);
        await showErrorToast(
          client,
          "Operator Error",
          "Operator memory failed to load. The agent is attempting to recover.",
        );
      }

      output.messages.unshift({
        info: {
          role: "user",
          sessionID,
        },
        parts: [{ type: "text", text: result.value.content, synthetic: true }],
      } as unknown as TransformMessage);
    },
  };
};

function sessionIDFrom(messages: ReadonlyArray<TransformMessage>): string | null {
  for (const message of messages) {
    const sessionID = (message.info as { readonly sessionID?: unknown }).sessionID;
    if (typeof sessionID === "string" && sessionID.length > 0) {
      return sessionID;
    }
  }
  return null;
}

async function showErrorToast(
  client: OpencodeClient,
  title: string,
  message: string,
): Promise<void> {
  await client.tui
    .showToast({
      title,
      message,
      variant: "error",
      duration: 10_000,
    })
    .catch(() => undefined);
}

export default OperatorPlugin;
