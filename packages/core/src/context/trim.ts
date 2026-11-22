import { inputOmissionNotice, outputOmissionNotice } from "./notices.ts";
import { stringifyToolContent, type RequestMessage } from "./tokens.ts";
import { isRecord, readString } from "../utils.ts";

// Pure trim planner. Rule bodies ported from Magic Compact prune.ts
// (679a2437), adapted from server-side part mutation to request-view part
// replacement: a tool call rides on an assistant message as a `tool-call`
// part, its result arrives as a separate `tool`-role message holding a
// `tool-result` part linked by call ID. Only completed calls (a tool-result
// exists with a non-error result) are candidates; pending, running, and
// errored calls, user messages, and system/preamble parts are never touched.
//
// The planner performs no I/O: the caller injects `resolveContentID`, which
// allocates (or reuses) the omission-store ID for a payload. Re-trimming is
// idempotent because the store returns the same ID for the same key, so the
// rebuilt replacement is byte-identical on every request.

export type OmissionRequest = {
  readonly key: string;
  readonly content: string;
};

// Returns null when no ID can be allocated; the planner then leaves that
// part intact instead of emitting a dead reference.
export type ResolveContentID = (request: OmissionRequest) => string | null;

export type TrimOptions = {
  readonly keepRecentTurns: number;
};

export type PartReplacement = {
  readonly messageIndex: number;
  readonly partIndex: number;
  readonly part: unknown;
};

export type TrimPlan = {
  readonly replacements: readonly PartReplacement[];
};

const DEFAULT_OUTPUT_DESCRIPTION = "Output omitted due to a compaction operation.";

const DEFAULT_LIMIT = { words: 128, chars: 1024 } as const;
const TASK_OUTPUT_LIMIT = { words: 512, chars: 4096 } as const;
const BASH_COMMAND_CHAR_LIMIT = 1024;
const BASH_HEAD_CHAR_LIMIT = 512;

export function planTrim(
  messages: readonly RequestMessage[],
  options: TrimOptions,
  resolveContentID: ResolveContentID,
): TrimPlan {
  const turns = computeTurns(messages);
  removeTrailingAssistantlessTurn(turns);

  // Keep-tail slicing ported from Magic Compact createTrimPlan: only calls
  // inside the planned turns are candidates; messages outside any turn are
  // never touched.
  const trimEndIndex = Math.max(0, turns.length - Math.max(0, options.keepRecentTurns));
  const trimmable = turns.slice(0, trimEndIndex);

  const replacements: PartReplacement[] = [];
  const calls = indexCalls(messages);
  const trimmableIndexes = new Set<number>();
  for (const turn of trimmable) {
    for (let index = turn.start; index <= turn.end; index++) {
      trimmableIndexes.add(index);
    }
  }

  for (const call of calls) {
    if (!trimmableIndexes.has(call.messageIndex)) {
      continue;
    }
    planCall(messages, call, resolveContentID, replacements);
  }

  return { replacements };
}

// --- Turn grouping (ported from Magic Compact plan.ts) ---

type TurnRange = {
  start: number;
  end: number;
  hasAssistant: boolean;
};

function computeTurns(messages: readonly RequestMessage[]): TurnRange[] {
  const turns: TurnRange[] = [];
  let current: TurnRange | null = null;

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message === undefined) {
      continue;
    }

    if (message.role === "user") {
      if (current?.hasAssistant) {
        current = null;
      }
      if (current === null) {
        current = { start: index, end: index, hasAssistant: false };
        turns.push(current);
      }
      current.end = index;
      continue;
    }

    if ((message.role === "assistant" || message.role === "tool") && current !== null) {
      if (message.role === "assistant") {
        current.hasAssistant = true;
      }
      current.end = index;
    }
  }

  return turns;
}

function removeTrailingAssistantlessTurn(turns: TurnRange[]): void {
  const last = turns.at(-1);
  if (last !== undefined && !last.hasAssistant) {
    // The trailing user-only turn may be an unanswered request; it is neither
    // trimmed nor counted against the protected tail.
    turns.pop();
  }
}

// --- Call indexing ---

type CallLocation = {
  readonly messageIndex: number;
  readonly partIndex: number;
  readonly callID: string;
  readonly toolName: string;
  readonly input: unknown;
};

type CallIndex = CallLocation & {
  readonly resultMessageIndex: number | null;
  readonly resultPartIndex: number | null;
  readonly resultValue: unknown;
  readonly resultIsError: boolean;
};

function indexCalls(messages: readonly RequestMessage[]): CallIndex[] {
  const results = new Map<string, { messageIndex: number; partIndex: number }>();

  for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
    const content = messages[messageIndex]?.content ?? [];
    for (let partIndex = 0; partIndex < content.length; partIndex++) {
      const part = content[partIndex];
      if (isToolResultPart(part)) {
        results.set(part.id, { messageIndex, partIndex });
      }
    }
  }

  const calls: CallIndex[] = [];
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
    const content = messages[messageIndex]?.content ?? [];
    for (let partIndex = 0; partIndex < content.length; partIndex++) {
      const part = content[partIndex];
      if (!isToolCallPart(part)) {
        continue;
      }
      const result = results.get(part.id) ?? null;
      const resultPart = result === null ? null : contentAt(messages, result);
      calls.push({
        messageIndex,
        partIndex,
        callID: part.id,
        toolName: part.name,
        input: part.input,
        resultMessageIndex: result?.messageIndex ?? null,
        resultPartIndex: result?.partIndex ?? null,
        resultValue: isToolResultPart(resultPart) ? resultPart.result.value : null,
        resultIsError: isToolResultPart(resultPart) && resultPart.result.type === "error",
      });
    }
  }

  return calls;
}

function contentAt(
  messages: readonly RequestMessage[],
  location: { messageIndex: number; partIndex: number },
): unknown {
  return messages[location.messageIndex]?.content[location.partIndex];
}

// --- Rule evaluation (ported from Magic Compact prune.ts) ---

function planCall(
  messages: readonly RequestMessage[],
  call: CallIndex,
  resolveContentID: ResolveContentID,
  replacements: PartReplacement[],
): void {
  if (call.resultMessageIndex === null || call.resultIsError) {
    // Pending, running, or errored calls are never touched.
    return;
  }

  const inputPlan = planInputOmission(call, resolveContentID);
  const outputPlan = planOutputOmission(call, resolveContentID);

  if (inputPlan !== null) {
    replacements.push({
      messageIndex: call.messageIndex,
      partIndex: call.partIndex,
      part: inputPlan.part,
    });
  }

  if (call.resultMessageIndex === null || call.resultPartIndex === null) {
    return;
  }

  const originalOutput = stringifyToolContent(call.resultValue);
  let nextOutput = originalOutput;
  let replaced = false;

  if (outputPlan !== null) {
    nextOutput = outputPlan.text;
    replaced = true;
  }

  if (inputPlan !== null && inputPlan.outputNotice !== null) {
    nextOutput = `${inputPlan.outputNotice}\n\n${nextOutput}`;
    replaced = true;
  }

  if (replaced) {
    replacements.push({
      messageIndex: call.resultMessageIndex,
      partIndex: call.resultPartIndex,
      part: {
        ...(contentAt(messages, {
          messageIndex: call.resultMessageIndex,
          partIndex: call.resultPartIndex,
        }) as object),
        result: { type: "text", value: nextOutput },
      },
    });
  }
}

type InputPlan = {
  readonly part: unknown;
  readonly outputNotice: string | null;
};

function planInputOmission(call: CallIndex, resolveContentID: ResolveContentID): InputPlan | null {
  if (!isRecord(call.input)) {
    return null;
  }

  const input = call.input;
  const originalPart = { type: "tool-call", id: call.callID, name: call.toolName, input };

  if (call.toolName === "write") {
    const content = readString(input, "content");
    if (content !== null && exceeds(content, DEFAULT_LIMIT)) {
      const contentID = resolveContentID({
        key: `${call.callID}:input`,
        content,
      });
      if (contentID === null) {
        return null;
      }
      return {
        part: { ...originalPart, input: { ...input, content: "[Omitted]" } },
        outputNotice: inputOmissionNotice(
          "File write contents omitted due to a compaction operation. If necessary, reread file to see current contents.",
          content.length,
          contentID,
        ),
      };
    }
  }

  if (call.toolName === "apply_patch") {
    const content = readString(input, "patchText");
    if (content !== null && exceeds(content, DEFAULT_LIMIT)) {
      const contentID = resolveContentID({
        key: `${call.callID}:input`,
        content,
      });
      if (contentID === null) {
        return null;
      }
      return {
        part: { ...originalPart, input: { ...input, patchText: "[Omitted]" } },
        outputNotice: inputOmissionNotice(
          "Patch text omitted due to compaction operation. If necessary, reread files to see current contents.",
          content.length,
          contentID,
        ),
      };
    }
  }

  if (call.toolName === "bash") {
    const content = readString(input, "command");
    if (content !== null && content.length > BASH_COMMAND_CHAR_LIMIT) {
      const contentID = resolveContentID({
        key: `${call.callID}:input`,
        content,
      });
      if (contentID === null) {
        return null;
      }
      return {
        part: {
          ...originalPart,
          input: {
            ...input,
            command: `${content.slice(0, BASH_HEAD_CHAR_LIMIT)}\n[REST OF COMMAND TRUNCATED]`,
          },
        },
        outputNotice: inputOmissionNotice(
          "Bash command truncated due to compaction operation.",
          content.length,
          contentID,
        ),
      };
    }
  }

  if (call.toolName === "edit") {
    const oldString = readString(input, "oldString");
    const newString = readString(input, "newString");
    if (oldString !== null && newString !== null) {
      const combined = `${oldString}\n${newString}`;
      if (exceeds(combined, DEFAULT_LIMIT)) {
        const contentID = resolveContentID({
          key: `${call.callID}:input`,
          content: combined,
        });
        if (contentID === null) {
          return null;
        }
        return {
          part: {
            ...originalPart,
            input: { ...input, oldString: "[Omitted]", newString: "[Omitted]" },
          },
          outputNotice: inputOmissionNotice(
            "File edit oldString and newString omitted due to compaction operation. If necessary, reread file to see current contents.",
            combined.length,
            contentID,
          ),
        };
      }
    }
  }

  return null;
}

type OutputPlan = {
  readonly text: string;
};

function planOutputOmission(
  call: CallIndex,
  resolveContentID: ResolveContentID,
): OutputPlan | null {
  const output = stringifyToolContent(call.resultValue);

  if (call.toolName === "question") {
    // Explicit user decisions are always preserved.
    return null;
  }

  if (call.toolName === "todowrite") {
    // Redundant; discarded without caching.
    return { text: "Successfully updated todos." };
  }

  if (call.toolName === "skill") {
    // Reloadable; discarded without caching.
    return {
      text: "Skill contents omitted due to compaction operation. If necessary, recall skill.",
    };
  }

  if (call.toolName === "read") {
    // File contents are reloadable; always omitted.
    const contentID = resolveContentID({ key: `${call.callID}:output`, content: output });
    if (contentID === null) {
      return null;
    }
    return {
      text: outputOmissionNotice(
        "Stale read contents omitted due to compaction operation. If necessary, reread to see current contents.",
        output.length,
        contentID,
      ),
    };
  }

  if (call.toolName === "task") {
    if (exceeds(output, TASK_OUTPUT_LIMIT)) {
      const contentID = resolveContentID({ key: `${call.callID}:output`, content: output });
      if (contentID === null) {
        return null;
      }
      return {
        text: outputOmissionNotice(
          "Task output omitted due to a compaction operation. If necessary, reread output via the operator:read_omitted tool.",
          output.length,
          contentID,
        ),
      };
    }
    return null;
  }

  if (!exceeds(output, DEFAULT_LIMIT)) {
    return null;
  }

  const contentID = resolveContentID({ key: `${call.callID}:output`, content: output });
  if (contentID === null) {
    return null;
  }
  return {
    text: outputOmissionNotice(DEFAULT_OUTPUT_DESCRIPTION, output.length, contentID),
  };
}

// --- Helpers ---

function exceeds(text: string, limit: { words: number; chars: number }): boolean {
  if (text.length > limit.chars) {
    return true;
  }
  return countWords(text, limit.words) > limit.words;
}

// Counts whitespace-separated runs like trim().split(/\s+/).length, but
// stops past maxWords instead of materializing every word of a huge output.
const WORD_SEPARATOR = /\s/;

function countWords(text: string, maxWords: number): number {
  let count = 0;
  let index = 0;
  while (index < text.length && count <= maxWords) {
    while (index < text.length && WORD_SEPARATOR.test(text[index] ?? "")) {
      index += 1;
    }
    if (index >= text.length) {
      break;
    }
    count += 1;
    while (index < text.length && !WORD_SEPARATOR.test(text[index] ?? "")) {
      index += 1;
    }
  }
  return count;
}

type ToolCallPart = {
  readonly type: "tool-call";
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
};

type ToolResultPart = {
  readonly type: "tool-result";
  readonly id: string;
  readonly name: string;
  readonly result: { readonly type: string; readonly value: unknown };
};

function isToolCallPart(part: unknown): part is ToolCallPart {
  return (
    isRecord(part)
    && part.type === "tool-call"
    && typeof part.id === "string"
    && typeof part.name === "string"
    && "input" in part
  );
}

function isToolResultPart(part: unknown): part is ToolResultPart {
  return (
    isRecord(part)
    && part.type === "tool-result"
    && typeof part.id === "string"
    && isRecord(part.result)
    && "value" in part.result
  );
}
