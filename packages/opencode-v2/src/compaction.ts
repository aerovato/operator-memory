import { buildCompactionPrompt } from "@aerovato/operator-core/context/compaction";
import { appendReceipt, type CompactReceipt } from "@aerovato/operator-core/context/receipts";
import { estimateContextTokens, type RequestMessage } from "@aerovato/operator-core/context/tokens";
import type { Context } from "@opencode/plugin/promise/plugin";
import { join } from "node:path";

import {
  ensureRefusalReceipt,
  ensureSessionHydrated,
  sessionRuntime,
  type ContextManagementDeps,
  type ContextRuntime,
} from "./runtime.ts";

// Shapes the host compaction request with Brain-referencing instructions on
// the system prompt. Messages go through intact: the host replaces the
// request-view history with exactly the summary it produces, so neither
// short-circuiting via `result` (which would substitute a content-free note
// for the history) nor excluding a "protected tail" (which would hide it
// from the summarizer and drop it from view) preserves anything. Verified
// live on v2.0.22.

export const DEFAULT_BRAIN_PATHS = ["~/.operator/user", ".operator", ".operator-shared"];

export type CompactionHookDeps = Omit<ContextManagementDeps, "requestCompaction"> & {
  readonly brainPaths: readonly string[];
};

export function registerCompactionHook(
  context: Context,
  deps: CompactionHookDeps,
  runtime: ContextRuntime,
): void {
  context.session.hook("compaction", async event => {
    const sessionID = event.sessionID;
    await ensureSessionHydrated(deps.stateDirectory, runtime, sessionID);
    if (!deps.isBrainAvailable(sessionID)) {
      await ensureRefusalReceipt(deps.stateDirectory, runtime, sessionID);
      return;
    }
    const session = sessionRuntime(runtime, sessionID);

    const estimatedTokens = estimateContextTokens(
      session.estimator,
      event.messages as readonly RequestMessage[],
    );

    event.system.push({
      type: "text",
      text: buildCompactionPrompt({ brainPaths: deps.brainPaths }),
    });

    // The cause is recorded by our own compaction requesters; a host-initiated
    // compaction carries none and is labeled manual.
    const cause = runtime.pendingCauses.get(sessionID) ?? "manual";
    runtime.pendingCauses.delete(sessionID);

    const receipt: CompactReceipt = {
      kind: "compact",
      trigger: cause,
      at: new Date().toISOString(),
      summarized: Math.max(0, estimatedTokens),
    };
    await appendReceipt(join(deps.stateDirectory, "context-log"), sessionID, receipt);
  });
}
