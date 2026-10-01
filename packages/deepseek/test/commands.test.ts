import { beforeEach, describe, expect, test, vi } from "vitest";

const childProcess = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock("node:child_process", () => ({ execFile: childProcess.execFile }));

import { OPERATOR_COMMAND_NAMES, registerCommands } from "../src/commands.ts";

type Invocation = {
  readonly agent: {
    readonly session: { readonly header: { readonly cwd: string } };
    readonly followup: ReturnType<typeof vi.fn>;
  };
  readonly signal: AbortSignal;
};

type Definition = {
  readonly name: string;
  readonly description: string;
  readonly handler: (invocation: Invocation) => Promise<{ readonly kind: string }>;
};

beforeEach(() => {
  childProcess.execFile.mockReset();
});

describe("DeepSeek Operator commands", () => {
  test("registers the four hyphenated command names", () => {
    const runtime = createRuntime();

    expect([...runtime.definitions.keys()]).toEqual(OPERATOR_COMMAND_NAMES);
  });

  test.each([
    ["operator-user-init", [["version"], ["user", "init"], ["user", "guide"]]],
    ["operator-project-init", [["version"], ["project", "init"], ["project", "guide"]]],
    ["operator-index", [["version"], ["index", "status"], ["index", "guide"]]],
    ["operator-repair", [["version"], ["memory", "check"]]],
  ] as const)("runs the canonical Helper sequence for %s", async (name, operations) => {
    for (const [index] of operations.entries()) queueRun({ stdout: `output-${index}`, code: 0 });
    const runtime = createRuntime();
    const invocation = createInvocation();

    await runtime.definitions.get(name)?.handler(invocation);

    expect(childProcess.execFile.mock.calls.map(call => call[1])).toEqual(operations);
    const text = invocation.agent.followup.mock.calls[0]?.[0].content[0].text as string;
    expect(text).toContain("<operator-command>");
    expect(text).toContain("<operator-instructions>");
  });

  test("hands Helper repair instructions to the active conversation when unavailable", async () => {
    queueRun({ stderr: "not found", code: 1 });
    const runtime = createRuntime();
    const invocation = createInvocation();

    await runtime.definitions.get("operator-index")?.handler(invocation);

    expect(childProcess.execFile).toHaveBeenCalledOnce();
    const text = invocation.agent.followup.mock.calls[0]?.[0].content[0].text as string;
    expect(text).toContain("<operator-diagnostic>");
    expect(text).toContain("/operator-index");
  });

  test("does not hand off cancelled command work", async () => {
    const controller = new AbortController();
    controller.abort();
    childProcess.execFile.mockImplementationOnce((_command, _arguments, _options, callback) => {
      queueMicrotask(() => callback(new DOMException("cancelled", "AbortError"), "", ""));
    });
    const runtime = createRuntime();
    const invocation = createInvocation(controller.signal);

    await expect(runtime.definitions.get("operator-repair")?.handler(invocation)).rejects.toThrow(
      "cancelled",
    );
    expect(invocation.agent.followup).not.toHaveBeenCalled();
  });
});

function createRuntime(): { readonly definitions: Map<string, Definition> } {
  const definitions = new Map<string, Definition>();
  registerCommands({
    commands: {
      register: (definition: Definition) => {
        definitions.set(definition.name, definition);
        return vi.fn();
      },
    },
  } as unknown as Parameters<typeof registerCommands>[0]);
  return { definitions };
}

function createInvocation(signal = new AbortController().signal): Invocation {
  return {
    agent: {
      session: { header: { cwd: "/project" } },
      followup: vi.fn(),
    },
    signal,
  };
}

function queueRun(result: {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly code: number;
}): void {
  childProcess.execFile.mockImplementationOnce((_command, _arguments, _options, callback) => {
    queueMicrotask(() => {
      const error =
        result.code === 0 ? null : Object.assign(new Error("Helper failed"), { code: result.code });
      callback(error, result.stdout ?? "", result.stderr ?? "");
    });
  });
}
