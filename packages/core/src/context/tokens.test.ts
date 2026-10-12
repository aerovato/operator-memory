import { expect, test } from "vitest";

import {
  EMPTY_ESTIMATOR,
  anchorEstimator,
  countRequestMessagesTokens,
  countSystemTokens,
  countTextTokens,
  estimateContextTokens,
  estimateSystemTokens,
  type RequestMessage,
  type StepTokenCounts,
} from "./tokens.ts";

const STEP_COUNTS: StepTokenCounts = {
  input: 1200,
  output: 340,
  reasoning: 0,
  cacheRead: 5600,
  cacheWrite: 7800,
};

test("counts tokens for plain text", () => {
  expect(countTextTokens("")).toBe(0);
  expect(countTextTokens("hello world")).toBeGreaterThan(0);
});

test("counts tokens across request-view part kinds", () => {
  const messages: RequestMessage[] = [
    { role: "user", content: [{ type: "text", text: "Summarize the report" }] },
    {
      role: "assistant",
      content: [
        { type: "reasoning", text: "The user wants a summary" },
        { type: "tool-call", id: "toolu_1", name: "read", input: { filePath: "/tmp/a.txt" } },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          id: "toolu_1",
          name: "read",
          result: { type: "text", value: "file body" },
        },
      ],
    },
  ];

  const total = countRequestMessagesTokens(messages);
  expect(total).toBeGreaterThan(0);

  const withoutReasoning: RequestMessage[] = [
    {
      role: "assistant",
      content: [
        { type: "tool-call", id: "toolu_1", name: "read", input: { filePath: "/tmp/a.txt" } },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          id: "toolu_1",
          name: "read",
          result: { type: "text", value: "file body" },
        },
      ],
    },
  ];
  expect(countRequestMessagesTokens(withoutReasoning)).toBeLessThan(total);
});

test("ignores part kinds it does not understand", () => {
  const messages: RequestMessage[] = [
    {
      role: "user",
      content: [
        { type: "media", mediaType: "image/png", data: "AAAA" },
        null,
        "not-a-part",
        { noType: true },
      ],
    },
  ];
  expect(countRequestMessagesTokens(messages)).toBe(0);
});

test("system prompt tokens accumulate over text parts", () => {
  expect(countSystemTokens([])).toBe(0);
  const single = countSystemTokens([{ type: "text", text: "You are helpful." }]);
  const double = countSystemTokens([
    { type: "text", text: "You are helpful." },
    { type: "text", text: "More guidance." },
  ]);
  expect(single).toBeGreaterThan(0);
  expect(double).toBeGreaterThan(single);
});

test("anchors on provider counts using input plus cache read plus cache write", () => {
  const estimator = anchorEstimator(STEP_COUNTS, 3);
  expect(estimator.anchoredTokens).toBe(1200 + 5600 + 7800);
  expect(estimator.anchoredMessageCount).toBe(3);
});

test("counts only the delta after an anchor", () => {
  const anchored = anchorEstimator(STEP_COUNTS, 2);
  const history: RequestMessage[] = [
    { role: "user", content: [{ type: "text", text: "first request" }] },
    { role: "assistant", content: [{ type: "text", text: "first answer" }] },
  ];
  const delta: RequestMessage[] = [
    { role: "user", content: [{ type: "text", text: "follow-up question" }] },
  ];

  expect(estimateContextTokens(anchored, history)).toBe(anchored.anchoredTokens);
  expect(estimateContextTokens(anchored, [...history, ...delta])).toBe(
    anchored.anchoredTokens + countRequestMessagesTokens(delta),
  );
});

test("falls back to a full local count before any anchor", () => {
  const messages: RequestMessage[] = [
    { role: "user", content: [{ type: "text", text: "question" }] },
  ];
  expect(estimateContextTokens(EMPTY_ESTIMATOR, messages)).toBe(
    countRequestMessagesTokens(messages),
  );
});

test("estimates system tokens from the gap between the first step and first user message", () => {
  const firstUser: RequestMessage = {
    role: "user",
    content: [{ type: "text", text: "a short question" }],
  };
  const estimated = estimateSystemTokens(STEP_COUNTS, firstUser);
  const expected =
    STEP_COUNTS.input
    + STEP_COUNTS.cacheRead
    + STEP_COUNTS.cacheWrite
    - countRequestMessagesTokens([firstUser]);
  expect(estimated).toBe(Math.max(0, expected));

  expect(estimateSystemTokens(STEP_COUNTS, null)).toBe(
    STEP_COUNTS.input + STEP_COUNTS.cacheRead + STEP_COUNTS.cacheWrite,
  );

  const tiny: StepTokenCounts = { input: 1, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
  const bigUser: RequestMessage = {
    role: "user",
    content: [{ type: "text", text: "word ".repeat(500) }],
  };
  expect(estimateSystemTokens(tiny, bigUser)).toBe(0);
});

test("drops a stale anchor when history shrank since the anchor", () => {
  const anchored = anchorEstimator(STEP_COUNTS, 12);
  const compacted: RequestMessage[] = [
    { role: "user", content: [{ type: "text", text: "summary of prior work" }] },
    { role: "assistant", content: [{ type: "text", text: "acknowledged" }] },
  ];

  // Without the clamp the estimate would report the full pre-compaction
  // provider total; instead it counts only the compacted history.
  expect(estimateContextTokens(anchored, compacted)).toBe(countRequestMessagesTokens(compacted));
});
