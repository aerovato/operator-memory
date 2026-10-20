import { anchorEstimator, type StepTokenCounts } from "@aerovato/operator-core/context/tokens";
import { evaluateTrigger, type TriggerKind } from "@aerovato/operator-core/context/triggers";
import type { Context } from "@opencode/plugin/promise/plugin";

import { toTriggerConfig } from "./context-config.ts";
import {
  ensureRefusalReceipt,
  ensureSessionHydrated,
  isContextStale,
  sessionRuntime,
  type ContextManagementDeps,
  type ContextRuntime,
} from "./runtime.ts";

// Subscribes to the host event stream: the completion trigger fires on the
// host's terminal-run signal, and every finished step re-anchors the token
// estimator on provider counts. Only the succeeded sibling is handled; the
// failed and interrupted siblings are separate events and are never
// subscribed, so failed runs never compact.

const EXECUTION_SUCCEEDED = "session.execution.succeeded";
const STEP_ENDED = "session.step.ended";

// Runs as a background loop; a dead or failed stream must not take the
// plugin down with it. The caller passes an AbortSignal tied to plugin
// teardown: the stream is created with that signal so the host closes it on
// unload, and the loop also exits when a superseding setup marks this
// generation stale (a reload without disposal would otherwise leave two
// loops consuming the same stream with separate dedup state, firing every
// task-complete compaction twice — the double-compact loop).
export function registerCompletionTrigger(
  context: Context,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
  options?: { readonly signal?: AbortSignal },
): void {
  const stream = context.event.subscribe(
    options?.signal !== undefined ? { signal: options.signal } : undefined,
  );
  void consume(stream, deps, runtime, options?.signal);
}

async function consume(
  stream: AsyncIterable<unknown>,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
  signal?: AbortSignal,
): Promise<void> {
  try {
    for await (const raw of stream) {
      if (signal?.aborted === true || isContextStale(deps)) {
        return;
      }
      await dispatchEvent(raw, deps, runtime).catch(() => undefined);
    }
  } catch {
    // Stream ended or failed; context management simply stops reacting.
  }
}

// Exported for tests. Unknown shapes (future event kinds, malformed payloads)
// are ignored, never fatal.
export async function dispatchEvent(
  raw: unknown,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
): Promise<void> {
  if (isContextStale(deps)) {
    return;
  }
  const event = asHostEvent(raw);
  if (event === null) {
    return;
  }

  // Only the completion path reads trigger state, so only it hydrates.
  // Step anchoring needs just the in-memory entry; ignored event kinds
  // need nothing and pay no disk read.
  if (event.type === EXECUTION_SUCCEEDED) {
    if (event.sessionID !== undefined) {
      await ensureSessionHydrated(deps.stateDirectory, runtime, event.sessionID);
      // A reload may have landed during hydration: re-check before the
      // trigger evaluation records anything in the shared runtime.
      if (isContextStale(deps)) {
        return;
      }
    }
    await handleExecutionSucceeded(event.sessionID, deps, runtime);
  } else if (event.type === STEP_ENDED) {
    handleStepEnded(event.sessionID, event.tokens, deps, runtime);
  }
}

async function handleExecutionSucceeded(
  sessionID: string | undefined,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
): Promise<void> {
  if (sessionID === undefined) {
    return;
  }
  if (!deps.isBrainAvailable(sessionID)) {
    await ensureRefusalReceipt(deps.stateDirectory, runtime, sessionID);
    return;
  }

  const session = sessionRuntime(runtime, sessionID);
  const estimate = session.lastEstimate;
  if (estimate === null) {
    // No request observed yet for this session; nothing to evaluate.
    return;
  }

  const decision = evaluateTrigger(
    session.triggerState,
    "task-complete",
    estimate,
    session.windowTokens ?? 0,
    toTriggerConfig(deps.config),
  );
  session.triggerState = decision.state;
  if (decision.fire === null) {
    return;
  }

  // No receipt here: the compaction hook records the compaction itself when
  // it executes, with the estimate over the actual request. A requested but
  // never-executed compaction leaves no record.
  deps.requestCompaction(sessionID, "task-complete");
}

function handleStepEnded(
  sessionID: string | undefined,
  tokens: StepTokenCounts | undefined,
  deps: ContextManagementDeps,
  runtime: ContextRuntime,
): void {
  if (sessionID === undefined || tokens === undefined) {
    return;
  }
  if (!deps.isBrainAvailable(sessionID)) {
    return;
  }

  // The step's provider total covers the most recent request the context hook
  // observed, so it anchors that many messages.
  const session = sessionRuntime(runtime, sessionID);
  session.estimator = anchorEstimator(tokens, session.lastMessageCount);
}

// Requests a host compaction. session.compact exists on the client but the
// plugin type Pick predates it, so the call goes through a narrow cast. Shared
// by the context hook and the completion trigger so index.ts stays trivial.
// The cause is recorded only when the request is actually dispatched; a host
// that predates session.compact or rejects the call leaves no entry, so a
// later host-initiated compaction is still labeled manual.
export function requestSessionCompaction(
  context: Context,
  runtime: ContextRuntime,
  sessionID: string,
  cause: TriggerKind,
): void {
  const session = context.session as unknown as {
    compact?: (input: { sessionID: string }) => Promise<unknown>;
  };
  if (typeof session.compact !== "function") {
    return;
  }
  runtime.pendingCauses.set(sessionID, cause);
  void session.compact({ sessionID }).catch(() => {
    runtime.pendingCauses.delete(sessionID);
  });
}

type HostEvent = {
  readonly type: string;
  readonly sessionID: string | undefined;
  readonly tokens: StepTokenCounts | undefined;
};

function asHostEvent(raw: unknown): HostEvent | null {
  if (typeof raw !== "object" || raw === null || !("type" in raw)) {
    return null;
  }
  const type = raw.type;
  if (typeof type !== "string") {
    return null;
  }

  const data = "data" in raw && typeof raw.data === "object" && raw.data !== null ? raw.data : null;
  const sessionID =
    data !== null && "sessionID" in data && typeof data.sessionID === "string"
      ? data.sessionID
      : undefined;

  return { type, sessionID, tokens: readStepTokens(data) };
}

function readStepTokens(data: object | null): StepTokenCounts | undefined {
  if (data === null || !("tokens" in data)) {
    return undefined;
  }
  const tokens = data.tokens;
  if (typeof tokens !== "object" || tokens === null) {
    return undefined;
  }

  const input = readCount(tokens, "input");
  const output = readCount(tokens, "output");
  const reasoning = readCount(tokens, "reasoning");
  const cache =
    "cache" in tokens && typeof tokens.cache === "object" && tokens.cache !== null
      ? tokens.cache
      : null;
  const cacheRead = cache === null ? null : readCount(cache, "read");
  const cacheWrite = cache === null ? null : readCount(cache, "write");

  if (
    input === null
    || output === null
    || reasoning === null
    || cacheRead === null
    || cacheWrite === null
  ) {
    return undefined;
  }
  return { input, output, reasoning, cacheRead, cacheWrite };
}

function readCount(record: object, key: string): number | null {
  if (!(key in record)) {
    return null;
  }
  const value: unknown = (record as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
