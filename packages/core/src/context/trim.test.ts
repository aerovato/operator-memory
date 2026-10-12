import { expect, test } from "vitest";

import type { RequestMessage } from "./tokens.ts";
import { planTrim, type ResolveContentID } from "./trim.ts";

// A resolver backed by a Map mimics the omission store: the first request for
// a key allocates an ID; later requests reuse it, which is what makes
// re-trimming idempotent.
function mapResolver(calls: { key: string; content: string }[]): ResolveContentID {
  const ids = new Map<string, string>();
  let next = 1;
  return request => {
    calls.push(request);
    const existing = ids.get(request.key);
    if (existing !== undefined) {
      return existing;
    }
    const id = `omitted-${String(next).padStart(3, "0")}`;
    next += 1;
    ids.set(request.key, id);
    return id;
  };
}

const NO_RESOLVER: ResolveContentID = () => {
  throw new Error("No omission expected");
};

function textMessage(role: "user" | "assistant", text: string): RequestMessage {
  return { role, content: [{ type: "text", text }] };
}

function callMessage(
  tool: string,
  callID: string,
  input: unknown,
  output: unknown,
  resultType: "text" | "error" = "text",
): RequestMessage[] {
  return [
    {
      role: "assistant",
      content: [{ type: "tool-call", id: callID, name: tool, input }],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          id: callID,
          name: tool,
          result: { type: resultType, value: output },
        },
      ],
    },
  ];
}

function bigOutput(chars: number): string {
  return "x".repeat(chars);
}

test("preserves the requested assistant-turn tail", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "first"),
    ...callMessage("read", "toolu_1", { filePath: "/a" }, bigOutput(2000)),
    textMessage("user", "second"),
    ...callMessage("read", "toolu_2", { filePath: "/b" }, bigOutput(2000)),
    textMessage("user", "third"),
    ...callMessage("read", "toolu_3", { filePath: "/c" }, bigOutput(2000)),
  ];
  const requests: { key: string; content: string }[] = [];

  const plan = planTrim(messages, { keepRecentTurns: 1 }, mapResolver(requests));

  // The first two turns' reads are omitted; the most recent turn is protected.
  expect(requests.map(request => request.key)).toEqual(["toolu_1:output", "toolu_2:output"]);
  expect(plan.replacements).toHaveLength(2);
  const replacement = plan.replacements[0];
  expect(replacement?.messageIndex).toBe(2);
  const replacementPart = replacement?.part as { result: { value: string } };
  expect(String(replacementPart.result.value)).toContain("tool-output-omission-notice");
});

test("re-trimming is idempotent through the resolver", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "task"),
    ...callMessage("todowrite", "toolu_1", {}, "verbose todo output"),
  ];
  const requests: { key: string; content: string }[] = [];
  const resolver = mapResolver(requests);

  const first = planTrim(messages, { keepRecentTurns: 0 }, resolver);
  const second = planTrim(messages, { keepRecentTurns: 0 }, resolver);

  // todowrite is discarded without caching, so no omission requests at all.
  expect(requests).toEqual([]);
  expect(first.replacements).toEqual(second.replacements);
  expect(first.replacements).toHaveLength(1);
});

test("read output is always omitted while its path argument survives", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "look"),
    ...callMessage("read", "toolu_9", { filePath: "/tmp/report.txt" }, bigOutput(50)),
  ];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, mapResolver([]));

  expect(plan.replacements).toHaveLength(1);
  const noticePart = plan.replacements[0]?.part as { result: { value: string } };
  const notice = noticePart.result.value;
  expect(notice).toContain("<tool-output-omission-notice>");
  expect(notice).toContain("Content ID: omitted-001");
  // No replacement for the tool-call part: input untouched.
  expect(plan.replacements[0]?.messageIndex).toBe(2);
});

test("bash commands over 1024 characters truncate to a head excerpt", () => {
  const command = `head -c 100 /dev/zero | tr '\\0' 'a'\n${"filler ".repeat(200)}`;
  expect(command.length).toBeGreaterThan(1024);
  const messages: RequestMessage[] = [
    textMessage("user", "run"),
    ...callMessage("bash", "toolu_b", { command }, "exit code 0"),
  ];
  const requests: { key: string; content: string }[] = [];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, mapResolver(requests));

  expect(requests).toEqual([{ key: "toolu_b:input", content: command }]);

  const inputPart = plan.replacements.find(replacement => replacement.messageIndex === 1)?.part as {
    input: { command: string };
  };
  expect(inputPart.input.command.endsWith("\n[REST OF COMMAND TRUNCATED]")).toBe(true);
  expect(inputPart.input.command.length).toBeLessThan(600);

  // The input notice is prepended to the kept output.
  const resultPart = plan.replacements.find(replacement => replacement.messageIndex === 2)
    ?.part as { result: { value: string } };
  expect(resultPart.result.value).toContain("<tool-input-omission-notice>");
  expect(resultPart.result.value).toContain("exit code 0");
});

test("omits large write, edit, and apply_patch inputs with [Omitted] markers", () => {
  const content = bigOutput(2000);
  const messages: RequestMessage[] = [
    textMessage("user", "edits"),
    ...callMessage("write", "toolu_w", { filePath: "/f", content }, "written"),
    ...callMessage("apply_patch", "toolu_p", { patchText: content }, "patched"),
    ...callMessage(
      "edit",
      "toolu_e",
      { filePath: "/f", oldString: content, newString: content },
      "edited",
    ),
  ];
  const requests: { key: string; content: string }[] = [];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, mapResolver(requests));

  expect(requests.map(request => request.key)).toEqual([
    "toolu_w:input",
    "toolu_p:input",
    "toolu_e:input",
  ]);
  const inputs = plan.replacements
    .filter(replacement => replacement.messageIndex % 2 === 1)
    .map(replacement => (replacement.part as { input: Record<string, string> }).input);
  expect(inputs[0]?.content).toBe("[Omitted]");
  expect(inputs[1]?.patchText).toBe("[Omitted]");
  expect(inputs[2]?.oldString).toBe("[Omitted]");
  expect(inputs[2]?.newString).toBe("[Omitted]");
});

test("omits default outputs only past 128 words or 1024 characters", () => {
  const atLimit = bigOutput(1024);
  const overLimit = bigOutput(1025);
  const messages: RequestMessage[] = [
    textMessage("user", "boundary"),
    ...callMessage("glob", "toolu_small", { pattern: "*" }, atLimit),
    ...callMessage("glob", "toolu_big", { pattern: "*" }, overLimit),
  ];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, mapResolver([]));

  const replaced = plan.replacements.map(replacement => replacement.messageIndex);
  expect(replaced).toEqual([4]);
});

test("task output uses the higher threshold", () => {
  const medium = bigOutput(2000);
  const messages: RequestMessage[] = [
    textMessage("user", "subtasks"),
    ...callMessage("task", "toolu_t", { prompt: "x" }, medium),
  ];

  // 2000 characters is over the default 1024 but under the task limit.
  expect(planTrim(messages, { keepRecentTurns: 0 }, NO_RESOLVER).replacements).toEqual([]);
});

test("never touches question output, pending calls, errored calls, or user text", () => {
  const messages: RequestMessage[] = [
    {
      role: "assistant",
      content: [
        // Pending call: no tool-result anywhere.
        { type: "tool-call", id: "toolu_pending", name: "read", input: { filePath: "/p" } },
      ],
    },
    {
      role: "tool",
      content: [
        // Errored call.
        {
          type: "tool-result",
          id: "toolu_err",
          name: "read",
          result: { type: "error", value: bigOutput(5000) },
        },
      ],
    },
    {
      role: "assistant",
      content: [
        { type: "tool-call", id: "toolu_err", name: "read", input: { filePath: "/e" } },
        { type: "tool-call", id: "toolu_q", name: "question", input: { questions: [] } },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          id: "toolu_q",
          name: "question",
          result: { type: "text", value: bigOutput(5000) },
        },
      ],
    },
    textMessage("user", bigOutput(5000)),
  ];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, NO_RESOLVER);
  expect(plan.replacements).toEqual([]);
});

test("skill output is discarded without caching", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "use skill"),
    ...callMessage("skill", "toolu_s", { name: "x" }, bigOutput(3000)),
  ];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, NO_RESOLVER);
  expect(plan.replacements).toHaveLength(1);
  const valuePart = plan.replacements[0]?.part as { result: { value: string } };
  const value = valuePart.result.value;
  expect(value).toContain("Skill contents omitted");
  expect(value).not.toContain("tool-output-omission-notice");
});

test("trailing assistantless turn is neither trimmed nor counted as protected", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "first"),
    ...callMessage("read", "toolu_1", { filePath: "/a" }, bigOutput(2000)),
    textMessage("user", "second"),
    ...callMessage("read", "toolu_2", { filePath: "/b" }, bigOutput(2000)),
    textMessage("user", "unanswered follow-up"),
  ];

  // The trailing user-only turn is dropped from planning, so keepRecentTurns 1
  // protects the second answered turn and the first read still trims.
  const requests: { key: string; content: string }[] = [];
  const plan = planTrim(messages, { keepRecentTurns: 1 }, mapResolver(requests));
  expect(requests.map(request => request.key)).toEqual(["toolu_1:output"]);
  expect(plan.replacements).toHaveLength(1);
  expect(plan.replacements[0]?.messageIndex).toBe(2);
});

test("leaves parts intact when no omission ID can be allocated", () => {
  const messages: RequestMessage[] = [
    textMessage("user", "look"),
    ...callMessage("read", "toolu_9", { filePath: "/tmp/report.txt" }, bigOutput(2000)),
  ];

  const plan = planTrim(messages, { keepRecentTurns: 0 }, () => null);
  expect(plan.replacements).toEqual([]);
});

test("counts words like split on whitespace runs, stopping past the limit", () => {
  const words = (count: number) => `${"word ".repeat(count).trimEnd()}   \n\t`;
  const messages: RequestMessage[] = [
    textMessage("user", "boundary"),
    ...callMessage("glob", "toolu_exact", { pattern: "*" }, words(128)),
    ...callMessage("glob", "toolu_over", { pattern: "*" }, words(129)),
  ];

  // Both outputs stay far under 1024 characters; only the word count trips.
  const plan = planTrim(messages, { keepRecentTurns: 0 }, mapResolver([]));

  const replaced = plan.replacements.map(replacement => replacement.messageIndex);
  expect(replaced).toEqual([4]);
});
