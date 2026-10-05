// Deterministic trigger evaluation. Token arithmetic and host-reported run
// outcomes only; never model judgment. Two evaluation paths feed the same
// deduplicated trigger set (spec.md Triggers):
//
// - "request": per outbound request inside the context hook. Ratio first,
//   then hard cap.
// - "task-complete": the host's session.execution.succeeded signal, gated on
//   compactOnComplete and compactFloorTokens.
//
// Dedup: a satisfied trigger does not fire again until the estimate has grown
// by min(10 percent of the window, 25,000 tokens) since it last fired. State
// is plain data keyed per trigger kind so the adapter can persist it per
// session; after a compaction drops the estimate, the delta goes negative and
// the trigger stays quiet, which is what prevents the compacted-run loop
// observed on v2.0.22.

export type TriggerKind = "ratio" | "hard-cap" | "task-complete";

export type TriggerEvent = "request" | "task-complete";

export type TriggerConfig = {
  readonly ratio: number;
  readonly hardCapTokens: number;
  readonly compactOnComplete: boolean;
  readonly compactFloorTokens: number;
};

export type TriggerState = {
  readonly fired: Readonly<Partial<Record<TriggerKind, number>>>;
};

export const EMPTY_TRIGGER_STATE: TriggerState = { fired: {} };

export type TriggerDecision = {
  readonly fire: TriggerKind | null;
  readonly state: TriggerState;
};

export function dedupDeltaTokens(windowTokens: number): number {
  if (windowTokens <= 0) {
    // Unknown window: fall back to the cap so a fired trigger still waits
    // for real growth instead of refiring on the same estimate.
    return 25000;
  }
  return Math.min(Math.floor(windowTokens * 0.1), 25000);
}

// True when the estimate sits over either size trigger. For checks that must
// not disturb a firing decision's dedup state (post-trim still-over).
export function exceedsThresholds(
  estimatedTokens: number,
  windowTokens: number,
  config: Pick<TriggerConfig, "ratio" | "hardCapTokens">,
): boolean {
  const overRatio = windowTokens > 0 && estimatedTokens / windowTokens > config.ratio;
  return overRatio || estimatedTokens > config.hardCapTokens;
}

export function evaluateTrigger(
  state: TriggerState,
  event: TriggerEvent,
  estimatedTokens: number,
  windowTokens: number,
  config: TriggerConfig,
): TriggerDecision {
  const candidates =
    event === "request"
      ? requestCandidates(estimatedTokens, windowTokens, config)
      : taskCompleteCandidates(estimatedTokens, config);

  for (const kind of candidates) {
    if (grewEnough(state, kind, estimatedTokens, windowTokens)) {
      return { fire: kind, state: recordFired(state, kind, estimatedTokens) };
    }
  }

  return { fire: null, state };
}

function requestCandidates(
  estimatedTokens: number,
  windowTokens: number,
  config: TriggerConfig,
): readonly TriggerKind[] {
  const candidates: TriggerKind[] = [];
  if (windowTokens > 0 && estimatedTokens / windowTokens > config.ratio) {
    candidates.push("ratio");
  }
  if (estimatedTokens > config.hardCapTokens) {
    candidates.push("hard-cap");
  }
  return candidates;
}

function taskCompleteCandidates(
  estimatedTokens: number,
  config: TriggerConfig,
): readonly TriggerKind[] {
  if (!config.compactOnComplete) {
    return [];
  }
  if (estimatedTokens < config.compactFloorTokens) {
    return [];
  }
  return ["task-complete"];
}

function grewEnough(
  state: TriggerState,
  kind: TriggerKind,
  estimatedTokens: number,
  windowTokens: number,
): boolean {
  const firedAt = state.fired[kind];
  if (firedAt === undefined) {
    return true;
  }
  // After a compaction the estimate shrinks, making this negative; the
  // trigger then stays silent until real growth returns.
  return estimatedTokens - firedAt >= dedupDeltaTokens(windowTokens);
}

function recordFired(
  state: TriggerState,
  kind: TriggerKind,
  estimatedTokens: number,
): TriggerState {
  return { fired: { ...state.fired, [kind]: estimatedTokens } };
}
