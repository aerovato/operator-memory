import { encode } from "gpt-tokenizer";

// Structural model of a harness request-view message. Field-exact against the
// OpenCode V2 hook event (@opencode/ai 2.0.14 Message schema): a message has a
// role and a `content` array whose elements are discriminated parts. Core
// stays harness-agnostic: parts core does not understand are `unknown` and
// contribute nothing to token counts, matching Magic Compact's default case.

export type RequestMessage = {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: readonly unknown[];
};

export type SystemPromptPart = {
  readonly type: "text";
  readonly text: string;
};

// Provider-reported counts for one finished step, as carried by the host's
// session.step.ended event. A request's true size on v2.0.22 was input plus
// cache read plus cache write.
export type StepTokenCounts = {
  readonly input: number;
  readonly output: number;
  readonly reasoning: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
};

// Local context estimator: adopts the last step's provider total as an anchor
// covering the first `anchoredMessageCount` messages, and locally counts only
// what arrived since. Pure data so callers can keep it per session.
export type ContextEstimator = {
  readonly anchoredTokens: number;
  readonly anchoredMessageCount: number;
};

export const EMPTY_ESTIMATOR: ContextEstimator = {
  anchoredTokens: 0,
  anchoredMessageCount: 0,
};

export function countTextTokens(text: string): number {
  return encode(text).length;
}

// Adopt a finished step's provider counts as the anchor, replacing any prior
// anchor. `messageCount` is the number of request-view messages the anchored
// request covered, supplied by the caller at anchor time.
export function anchorEstimator(counts: StepTokenCounts, messageCount: number): ContextEstimator {
  return {
    anchoredTokens: counts.input + counts.cacheRead + counts.cacheWrite,
    anchoredMessageCount: messageCount,
  };
}

// Estimated context size: the provider anchor plus a local count of messages
// that arrived after it. Before any anchor exists this is a pure local count
// over the whole request.
export function estimateContextTokens(
  estimator: ContextEstimator,
  messages: readonly RequestMessage[],
): number {
  if (estimator.anchoredMessageCount > messages.length) {
    // History shrank since the anchor (a compaction replaced it with a
    // summary); the provider total no longer covers these messages.
    return countRequestMessagesTokens(messages);
  }
  const delta = messages.slice(estimator.anchoredMessageCount);
  return estimator.anchoredTokens + countRequestMessagesTokens(delta);
}

export function countRequestMessagesTokens(messages: readonly RequestMessage[]): number {
  let total = 0;
  for (const message of messages) {
    for (const part of message.content) {
      total += countTextTokens(extractPartTexts(part).join("\n\n"));
    }
  }
  return total;
}

export function countSystemTokens(parts: readonly SystemPromptPart[]): number {
  let total = 0;
  for (const part of parts) {
    total += countTextTokens(part.text);
  }
  return total;
}

// Magic Compact's system-prompt estimation trick (stats/tokenize.ts): when no
// provider count is available for the system prompt, estimate it from the gap
// between the first step's provider-reported total and the locally counted
// user message of that step.
export function estimateSystemTokens(
  firstStepTokens: StepTokenCounts,
  firstUserMessage: RequestMessage | null,
): number {
  const firstUserTokens =
    firstUserMessage === null ? 0 : countRequestMessagesTokens([firstUserMessage]);
  const firstTotal = firstStepTokens.input + firstStepTokens.cacheRead + firstStepTokens.cacheWrite;
  return Math.max(0, firstTotal - firstUserTokens);
}

function extractPartTexts(part: unknown): string[] {
  if (typeof part !== "object" || part === null) {
    return [];
  }

  const type = "type" in part ? part.type : null;
  if (type === "text" && "text" in part && typeof part.text === "string") {
    return [part.text];
  }
  if (type === "reasoning" && "text" in part && typeof part.text === "string") {
    return [part.text];
  }
  if (type === "tool-call") {
    return extractToolCallTexts(part);
  }
  if (type === "tool-result") {
    return extractToolResultTexts(part);
  }
  return [];
}

function extractToolCallTexts(part: object): string[] {
  const texts: string[] = [];
  if ("input" in part && part.input !== undefined) {
    texts.push(stringifyToolContent(part.input));
  }
  return texts;
}

function extractToolResultTexts(part: object): string[] {
  const texts: string[] = [];
  if (!("result" in part) || typeof part.result !== "object" || part.result === null) {
    return texts;
  }

  const result: unknown = part.result;
  if (typeof result === "object" && result !== null && "value" in result) {
    texts.push(stringifyToolContent(result.value));
  }
  return texts;
}

export function stringifyToolContent(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
