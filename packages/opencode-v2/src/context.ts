import { appendReceipt, type TrimReceipt } from "@aerovato/operator-core/context/receipts";
import { listOmissions, storeOmission } from "@aerovato/operator-core/context/store";
import { evaluateTrigger, exceedsThresholds } from "@aerovato/operator-core/context/triggers";
import { planTrim, type OmissionRequest } from "@aerovato/operator-core/context/trim";
import {
  countTextTokens,
  estimateContextTokens,
  type RequestMessage,
} from "@aerovato/operator-core/context/tokens";
import type { Context } from "@opencode/plugin/promise/plugin";
import { join } from "node:path";

import { toTriggerConfig } from "./context-config.ts";
import {
  ensureRefusalReceipt,
  ensureSessionHydrated,
  isContextStale,
  resolveWindowTokens,
  sessionRuntime,
  type ContextManagementDeps,
  type ContextRuntime,
} from "./runtime.ts";

// Registers the session "context" hook: estimate the request, evaluate the
// ratio and hard-cap triggers, apply the trim plan as transient part
// replacements, write the receipt, and request compaction when the estimate
// is still over threshold after trimming. All logic lives in core; this
// module only wires host inputs to core functions.

export function registerContextHook(
  context: Context,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
): void {
  context.session.hook("context", async event => {
    if (isContextStale(deps)) {
      return;
    }
    const sessionID = event.sessionID;
    const config = deps.config;

    await ensureSessionHydrated(deps.stateDirectory, runtime, sessionID);
    if (!deps.isBrainAvailable(sessionID)) {
      await ensureRefusalReceipt(deps.stateDirectory, runtime, sessionID);
      return;
    }
    const session = sessionRuntime(runtime, sessionID);

    const estimatedTokens = estimateContextTokens(session.estimator, event.messages);
    const windowTokens = await resolveWindowTokens(context, session, event.model);
    session.lastEstimate = estimatedTokens;
    session.lastMessageCount = event.messages.length;

    // Trim applies on every over-threshold request: hook mutations are
    // transient, so each request re-applies the same trim deterministically.
    // Only the receipt and the compaction request are deduplicated.
    if (!exceedsThresholds(estimatedTokens, windowTokens ?? 0, config)) {
      return;
    }

    const trimResult = await trimRequest(sessionID, event.messages, deps);
    for (const replacement of trimResult.plan.replacements) {
      const message = event.messages[replacement.messageIndex];
      if (message !== undefined) {
        (message.content as unknown[])[replacement.partIndex] = replacement.part;
      }
    }

    // A reload may have landed during the awaits above: re-check before
    // recording dedup state or writing receipts in the shared runtime.
    if (isContextStale(deps)) {
      return;
    }

    const decision = evaluateTrigger(
      session.triggerState,
      "request",
      estimatedTokens,
      windowTokens ?? 0,
      toTriggerConfig(config),
    );
    session.triggerState = decision.state;
    // The request path only produces ratio and hard-cap triggers; the
    // task-complete trigger belongs to the event path.
    if (decision.fire === null || decision.fire === "task-complete") {
      return;
    }
    const fired = decision.fire;

    const receipt: TrimReceipt = {
      kind: "trim",
      trigger: fired,
      at: new Date().toISOString(),
      tokens: estimatedTokens,
      removed: trimResult.removedTokens,
      omissions: trimResult.omissionCount,
    };
    await appendReceipt(join(deps.stateDirectory, "context-log"), sessionID, receipt);

    const estimateAfterTrim = estimatedTokens - trimResult.removedTokens;
    if (exceedsThresholds(estimateAfterTrim, windowTokens ?? 0, config)) {
      deps.requestCompaction(sessionID, fired);
    }
  });
}

type TrimOutcome = {
  readonly plan: ReturnType<typeof planTrim>;
  readonly removedTokens: number;
  readonly omissionCount: number;
};

// Two passes: the first collects the omission requests, the second builds the
// replacements with real content IDs. planTrim is pure and deterministic, so
// both passes produce the same plan; running it twice keeps the omission
// store (async, in core) as the only write path.
async function trimRequest(
  sessionID: string,
  messages: readonly RequestMessage[],
  deps: ContextManagementDeps,
): Promise<TrimOutcome> {
  const requests: OmissionRequest[] = [];
  planTrim(messages, { keepRecentTurns: deps.config.keepRecentTurns }, request => {
    requests.push(request);
    return "";
  });

  const omittedRoot = join(deps.stateDirectory, "omitted");
  const index = await listOmissions(omittedRoot, sessionID);
  const knownKeys = new Set(index.ok ? index.value.map(entry => entry.key) : []);

  const contentIDs = new Map<string, string>();
  const seen = new Set<string>();
  const failedKeys = new Set<string>();
  let omissionCount = 0;
  let removedTokens = 0;

  for (const request of requests) {
    if (seen.has(request.key)) {
      continue;
    }
    seen.add(request.key);

    const stored = await storeOmission(omittedRoot, sessionID, request.key, request.content);
    if (stored.ok) {
      contentIDs.set(request.key, stored.value);
      if (!knownKeys.has(request.key)) {
        omissionCount += 1;
        removedTokens += countTextTokens(request.content);
      }
    } else {
      // The store is best-effort: payloads that cannot be persisted stay in
      // context instead of failing the request.
      failedKeys.add(request.key);
    }
  }

  const plan = planTrim(messages, { keepRecentTurns: deps.config.keepRecentTurns }, request => {
    if (failedKeys.has(request.key)) {
      return null;
    }
    return contentIDs.get(request.key) ?? null;
  });

  return { plan, removedTokens, omissionCount };
}
