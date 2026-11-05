// Compaction support: the prompt that shapes a host compaction request.
//
// The spec's core contract: compression removes bulk, documentation preserves
// knowledge. The prompt therefore never inlines Brain content; it references
// Brain partition paths, and it instructs the summarizer to write
// conversation-only specs and decisions to the Brain first, because
// compaction is lossy and the Brain is not.
//
// Shaping is prompt-only by design. Live verification on v2.0.22 showed the
// host replaces the request-view history with exactly the summary produced:
// setting `result` substitutes a content-free note for the history, and
// excluding a "protected tail" from the request hides it from the summarizer
// and drops it from view. Neither preserves anything.

import type { TriggerKind } from "./triggers.ts";

// Why a compaction ran: one of our triggers, or a host-initiated compaction
// (user command, host overflow handling) carrying no recorded cause.
export type CompactionCause = TriggerKind | "manual";

export type CompactionPromptInput = {
  // Brain partition roots, least to most authoritative, exactly as the
  // preamble renders them (for example "~/.operator/user", ".operator",
  // ".operator-shared").
  readonly brainPaths: readonly string[];
};

export function buildCompactionPrompt(input: CompactionPromptInput): string {
  const paths = input.brainPaths.map(path => `- ${path}`).join("\n");

  return `<compaction-instructions>
You are compacting the conversation history for an Operator Memory session.
Produce a summary that lets the next session continue the work without the
full history.

The summary must preserve, in order of importance:
1. The current task and what has been completed so far.
2. Active files: paths the work depends on, with a one-line note on the role
   of each.
3. Blockers and open questions.
4. Key decisions already made, with their reasons.

Rules:
- Tool input/output omission notices (content IDs) are the only recoverable
  handles for trimmed content. Keep every omission notice verbatim in the
  summary; the agent recovers payloads through the operator:read_omitted
  tool.
- Durable knowledge lives in the Brain partitions. Reference these paths
  instead of inlining their content:
${paths}
- Before summarizing, ensure any spec or decision that exists only in this
  conversation is written to the appropriate Brain document.
- Compaction is lossy; the Brain is not.
</compaction-instructions>`;
}
