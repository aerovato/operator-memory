import {
  EMPTY_TRIGGER_STATE,
  type TriggerKind,
  type TriggerState,
} from "@aerovato/operator-core/context/triggers";
import { EMPTY_ESTIMATOR, type ContextEstimator } from "@aerovato/operator-core/context/tokens";
import { appendReceipt, readReceipts } from "@aerovato/operator-core/context/receipts";
import type { Context } from "@opencode/plugin/promise/plugin";
import { join } from "node:path";

import type { ContextManagementConfig } from "./context-config.ts";

// Per-session runtime state for context management. Kept in memory: dedup and
// the provider anchor are heuristics, so losing them on restart is safe (the
// receipts and omission store on disk remain the audit trail).

export type SessionRuntime = {
  estimator: ContextEstimator;
  triggerState: TriggerState;
  // Declared context window of the session's model; null when unknown, which
  // disables ratio evaluation for that session.
  windowTokens: number | null;
  // Model the cached window belongs to; a switch re-resolves from scratch.
  windowModel: string | null;
  // Consecutive catalog lookup failures for the current model; retries stop
  // after MAX_WINDOW_LOOKUP_ATTEMPTS so an unlisted model does not pay a
  // catalog fetch on every request.
  windowFailures: number;
  // Most recent context-hook estimate and the request size it covered.
  // Written by the context hook; read by the completion trigger (estimate)
  // and the step anchor (message count).
  lastEstimate: number | null;
  lastMessageCount: number;
};

export type ContextRuntime = {
  readonly sessions: Map<string, SessionRuntime>;
  // Sessions that already logged a refusal; the Brain gate records one
  // refusal receipt per session, never one per request.
  readonly refusals: Set<string>;
  // Sessions whose trigger state was already seeded from disk. Tracked
  // separately from sessions: paths that only need the session entry (step
  // anchoring, compaction shaping) must not mark it hydrated.
  readonly hydrated: Set<string>;
  // Compaction causes recorded by our own requesters, consumed once by the
  // compaction hook for the receipt label. A host-initiated compaction finds
  // no entry and is labeled manual.
  readonly pendingCauses: Map<string, TriggerKind>;
};

// Shared wiring for the context-management hooks: the config, the state
// root, the compaction requester, and the Brain gate. The compaction hook
// extends this with its Brain path list.
export type ContextManagementDeps = {
  readonly config: ContextManagementConfig;
  // ~/.operator/state; the adapter computes it from the user home.
  readonly stateDirectory: string;
  readonly requestCompaction: (sessionID: string, cause: TriggerKind) => void;
  // Brain availability per session, tracked by setup from preamble loads.
  // The feature stays off without the Brain.
  readonly isBrainAvailable: (sessionID: string) => boolean;
  // True while the registering setup is still the live generation. Stale
  // setups (teardown/reload without disposal) no-op instead of enforcing
  // with empty dedup state and double-firing triggers.
  readonly isCurrent?: () => boolean;
};

export function createContextRuntime(): ContextRuntime {
  return {
    sessions: new Map(),
    refusals: new Set(),
    hydrated: new Set(),
    pendingCauses: new Map(),
  };
}

// Process-wide runtime shared across plugin reloads. A fresh runtime per
// setup loses in-memory dedup on every reload; the seeding from disk only
// covers executed compactions, so a requested-but-not-yet-executed
// compaction followed by a reload would fire a second time on the next
// terminal signal. Sharing keeps the fired entries (and the refusal record)
// alive across generations within the process.
let sharedRuntime: ContextRuntime | null = null;

export function sharedContextRuntime(): ContextRuntime {
  if (sharedRuntime === null) {
    sharedRuntime = createContextRuntime();
  }
  return sharedRuntime;
}

export function sessionRuntime(runtime: ContextRuntime, sessionID: string): SessionRuntime {
  const existing = runtime.sessions.get(sessionID);
  if (existing !== undefined) {
    return existing;
  }

  const created: SessionRuntime = {
    estimator: EMPTY_ESTIMATOR,
    triggerState: EMPTY_TRIGGER_STATE,
    windowTokens: null,
    windowModel: null,
    windowFailures: 0,
    lastEstimate: null,
    lastMessageCount: 0,
  };
  runtime.sessions.set(sessionID, created);
  return created;
}

// Resolves the session model's declared context window from the catalog,
// caching it on the session keyed by model. Null when unknown, which
// disables ratio evaluation for that session. Failed lookups retry on
// later requests up to a bound, then stay null until the model changes.
export const MAX_WINDOW_LOOKUP_ATTEMPTS = 3;

export async function resolveWindowTokens(
  context: Context,
  session: Pick<SessionRuntime, "windowTokens" | "windowModel" | "windowFailures">,
  model: { readonly id: string; readonly providerID: string },
): Promise<number | null> {
  if (session.windowModel !== model.id) {
    session.windowModel = model.id;
    session.windowTokens = null;
    session.windowFailures = 0;
  }
  if (session.windowTokens !== null || session.windowFailures >= MAX_WINDOW_LOOKUP_ATTEMPTS) {
    return session.windowTokens;
  }

  try {
    const listed = await context.model.list();
    // Model.Ref.id is the full "provider/model" identifier; fall back to
    // rebuilding it when a variant suffix differs from the catalog entry.
    const fallback = `${model.providerID}/${model.id.split("/")[1] ?? model.id}`;
    const info = listed.data.find(entry => entry.id === model.id || entry.id === fallback);
    const limit = info?.limit.context ?? 0;
    if (limit > 0) {
      session.windowTokens = limit;
      session.windowFailures = 0;
    } else {
      session.windowFailures += 1;
    }
  } catch {
    session.windowFailures += 1;
  }

  return session.windowTokens;
}

// Seeds a session's trigger state and refusal record from its receipt log
// the first time this process touches it. Dedup is per session, and sessions
// outlive processes (continued runs); without this a new process would
// refire triggers the previous process already satisfied. Seeding merges:
// live state wins ties, so pre-seeded test state survives. Only a readable
// log marks the session hydrated; a failed read retries on the next touch.
export async function ensureSessionHydrated(
  stateDirectory: string,
  runtime: ContextRuntime,
  sessionID: string,
): Promise<void> {
  if (runtime.hydrated.has(sessionID)) {
    return;
  }

  const receipts = await readReceipts(join(stateDirectory, "context-log"), sessionID);
  if (!receipts.ok) {
    return;
  }

  const session = sessionRuntime(runtime, sessionID);
  const fired: Partial<Record<TriggerKind, number>> = {};
  for (const receipt of receipts.value) {
    if (receipt.kind === "refusal") {
      runtime.refusals.add(sessionID);
    } else if (receipt.kind === "trim") {
      fired[receipt.trigger] = receipt.tokens;
    } else if (receipt.trigger !== "manual") {
      fired[receipt.trigger] = receipt.summarized;
    }
  }
  session.triggerState = { fired: { ...fired, ...session.triggerState.fired } };
  runtime.hydrated.add(sessionID);
}
// Records the Brain-unavailable refusal once per session. The feature stays
// off without the Brain; the receipt is the audit trail.
export async function ensureRefusalReceipt(
  stateDirectory: string,
  runtime: ContextRuntime,
  sessionID: string,
): Promise<void> {
  if (runtime.refusals.has(sessionID)) {
    return;
  }
  runtime.refusals.add(sessionID);
  await appendReceipt(join(stateDirectory, "context-log"), sessionID, {
    kind: "refusal",
    at: new Date().toISOString(),
    reason: "brain-unavailable",
  });
}
