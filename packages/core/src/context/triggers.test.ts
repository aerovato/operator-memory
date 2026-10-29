import { expect, test } from "vitest";

import {
  dedupDeltaTokens,
  EMPTY_TRIGGER_STATE,
  evaluateTrigger,
  exceedsThresholds,
  type TriggerConfig,
} from "./triggers.ts";

const CONFIG: TriggerConfig = {
  ratio: 0.8,
  hardCapTokens: 250000,
  compactOnComplete: true,
  compactFloorTokens: 32000,
};

const WINDOW = 100000;
const RATIO_AT = Math.floor(WINDOW * 0.8);

test("delta is 10 percent of the window, capped at 25000", () => {
  expect(dedupDeltaTokens(100000)).toBe(10000);
  expect(dedupDeltaTokens(1000000)).toBe(25000);
  expect(dedupDeltaTokens(100)).toBe(10);
});

test("ratio fires only when the estimate strictly exceeds the ratio", () => {
  const below = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", RATIO_AT, WINDOW, CONFIG);
  expect(below.fire).toBeNull();

  const above = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", RATIO_AT + 1, WINDOW, CONFIG);
  expect(above.fire).toBe("ratio");
});

test("hard cap fires when the absolute cap is exceeded", () => {
  const unreachableRatio = { ...CONFIG, ratio: 5 };
  const decision = evaluateTrigger(
    EMPTY_TRIGGER_STATE,
    "request",
    250001,
    WINDOW,
    unreachableRatio,
  );
  expect(decision.fire).toBe("hard-cap");

  const at = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 250000, WINDOW, unreachableRatio);
  expect(at.fire).toBeNull();
});

test("ratio takes precedence over hard cap on the request path", () => {
  const decision = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 260000, WINDOW / 0.8, CONFIG);
  expect(decision.fire).toBe("ratio");
});

test("request path never evaluates the task-complete trigger", () => {
  const decision = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 40000, WINDOW, CONFIG);
  expect(decision.fire).toBeNull();
});

test("task-complete respects the floor and the enabled flag", () => {
  expect(
    evaluateTrigger(EMPTY_TRIGGER_STATE, "task-complete", 31999, WINDOW, CONFIG).fire,
  ).toBeNull();
  expect(evaluateTrigger(EMPTY_TRIGGER_STATE, "task-complete", 32000, WINDOW, CONFIG).fire).toBe(
    "task-complete",
  );

  const disabled = evaluateTrigger(EMPTY_TRIGGER_STATE, "task-complete", 32000, WINDOW, {
    ...CONFIG,
    compactOnComplete: false,
  });
  expect(disabled.fire).toBeNull();
});

test("a fired trigger does not refire until the estimate grows by the delta", () => {
  const delta = dedupDeltaTokens(WINDOW);
  const first = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", RATIO_AT + 1, WINDOW, CONFIG);
  expect(first.fire).toBe("ratio");

  const same = evaluateTrigger(first.state, "request", RATIO_AT + 1, WINDOW, CONFIG);
  expect(same.fire).toBeNull();
  expect(same.state).toEqual(first.state);

  const smallGrowth = evaluateTrigger(
    first.state,
    "request",
    RATIO_AT + 1 + delta - 1,
    WINDOW,
    CONFIG,
  );
  expect(smallGrowth.fire).toBeNull();

  const enoughGrowth = evaluateTrigger(
    first.state,
    "request",
    RATIO_AT + 1 + delta,
    WINDOW,
    CONFIG,
  );
  expect(enoughGrowth.fire).toBe("ratio");
});

test("dedup is tracked per trigger kind", () => {
  const fired = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 260000, 300000, CONFIG);
  expect(fired.fire).toBe("ratio");

  const complete = evaluateTrigger(fired.state, "task-complete", 100000, 300000, CONFIG);
  expect(complete.fire).toBe("task-complete");
});

test("a shrunk estimate after compaction stays silent", () => {
  const unreachableRatio = { ...CONFIG, ratio: 2 };
  const fired = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 260000, 250000, unreachableRatio);
  expect(fired.fire).toBe("hard-cap");

  const afterCompact = evaluateTrigger(fired.state, "request", 40000, 250000, CONFIG);
  expect(afterCompact.fire).toBeNull();
});

test("ratio cannot fire without a declared window", () => {
  const decision = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 1000000, 0, {
    ...CONFIG,
    hardCapTokens: 5000000,
  });
  expect(decision.fire).toBeNull();
});

test("delta falls back to the cap when the window is unknown", () => {
  expect(dedupDeltaTokens(0)).toBe(25000);
  expect(dedupDeltaTokens(-100)).toBe(25000);
});

test("hard-cap dedups on the same estimate without a window", () => {
  const unreachableRatio = { ...CONFIG, ratio: 5 };
  const first = evaluateTrigger(EMPTY_TRIGGER_STATE, "request", 260000, 0, unreachableRatio);
  expect(first.fire).toBe("hard-cap");

  const same = evaluateTrigger(first.state, "request", 260000, 0, unreachableRatio);
  expect(same.fire).toBeNull();

  const grown = evaluateTrigger(first.state, "request", 260000 + 25000, 0, unreachableRatio);
  expect(grown.fire).toBe("hard-cap");
});

test("task-complete dedups on the same estimate without a window", () => {
  const first = evaluateTrigger(EMPTY_TRIGGER_STATE, "task-complete", 100000, 0, CONFIG);
  expect(first.fire).toBe("task-complete");

  const same = evaluateTrigger(first.state, "task-complete", 100000, 0, CONFIG);
  expect(same.fire).toBeNull();
});

test("exceedsThresholds mirrors the size triggers without dedup state", () => {
  const config = { ratio: 0.8, hardCapTokens: 250000 };
  expect(exceedsThresholds(80001, 100000, config)).toBe(true);
  expect(exceedsThresholds(250001, 1000000, config)).toBe(true);
  expect(exceedsThresholds(50000, 100000, config)).toBe(false);
  expect(exceedsThresholds(999999, 0, { ratio: 0.8, hardCapTokens: 5000000 })).toBe(false);
});
