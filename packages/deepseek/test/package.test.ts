import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { beforeEach, describe, expect, test, vi } from "vitest";

const childProcess = vi.hoisted(() => ({ spawn: vi.fn() }));
const core = vi.hoisted(() => ({
  loadMemorySnapshot: vi.fn(),
  renderPreamble: vi.fn(),
}));

vi.mock("node:child_process", () => ({ spawn: childProcess.spawn }));
vi.mock("@aerovato/operator-core/memory/load", () => ({
  loadMemorySnapshot: core.loadMemorySnapshot,
}));
vi.mock("@aerovato/operator-core/preamble", () => ({
  renderPreamble: core.renderPreamble,
}));

import { apply, inject, name } from "../src/index.ts";

const packageDirectory = resolve(import.meta.dirname, "..");

beforeEach(() => {
  childProcess.spawn.mockReset();
  childProcess.spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });
  core.loadMemorySnapshot.mockReset();
  core.renderPreamble.mockReset();
});

describe("DeepSeek adapter package", () => {
  test("exports a function Host plugin", () => {
    expect(name).toBe("operator-memory");
    expect(inject).toEqual(["systemPrompt"]);
    expect(apply).toBeTypeOf("function");
  });

  test("mounts the Host plugin through its bundle patch", async () => {
    const patch = await readFile(resolve(packageDirectory, "cordis.patch.yml"), "utf8");

    expect(patch).toContain("id: operator-memory");
    expect(patch).toContain("name: '@aerovato/operator-deepseek'");
  });

  test("coalesces concurrent rendering and keeps one stable preamble per live agent", async () => {
    const deferred = Promise.withResolvers<object>();
    core.loadMemorySnapshot.mockReturnValue(deferred.promise);
    core.renderPreamble.mockReturnValue({ loaded: true, content: "operator preamble" });
    const agent = createAgent("/project");
    const runtime = createRuntime();

    apply(runtime.context);
    const firstPending = runtime.assemble(agent);
    const secondPending = runtime.assemble(agent);

    expect(childProcess.spawn).toHaveBeenCalledOnce();
    expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();
    expect(core.loadMemorySnapshot).toHaveBeenCalledWith("/project", expect.any(String), true);
    deferred.resolve({});
    const [first, second] = await Promise.all([firstPending, secondPending]);
    expect(first.sections[0]).toEqual({
      name: "operator:memory",
      text: "operator preamble",
      interpolate: false,
    });
    expect(second.sections[0]).toEqual(first.sections[0]);
    expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();
  });

  test("renders independently for distinct conversation agents", async () => {
    core.loadMemorySnapshot.mockResolvedValue({});
    core.renderPreamble
      .mockReturnValueOnce({ loaded: true, content: "parent preamble" })
      .mockReturnValueOnce({ loaded: true, content: "child preamble" });
    const runtime = createRuntime();
    apply(runtime.context);

    const parent = await runtime.assemble(createAgent("/parent"));
    const child = await runtime.assemble(createAgent("/child"));

    expect(parent.sections[0]?.text).toBe("parent preamble");
    expect(child.sections[0]?.text).toBe("child preamble");
    expect(core.loadMemorySnapshot.mock.calls.map(call => call[0])).toEqual(["/parent", "/child"]);
  });

  test("does not render for diagnostic assemblies without an agent", async () => {
    const runtime = createRuntime();
    apply(runtime.context);

    const assembly = await runtime.assemble(undefined);

    expect(assembly.sections).toEqual([]);
    expect(core.loadMemorySnapshot).not.toHaveBeenCalled();
  });

  test("injects the canonical diagnostic returned by Core", async () => {
    core.loadMemorySnapshot.mockResolvedValue({});
    core.renderPreamble.mockReturnValue({ loaded: false, content: "canonical diagnostic" });
    const runtime = createRuntime();
    apply(runtime.context);

    const assembly = await runtime.assemble(createAgent("/project"));

    expect(assembly.sections[0]?.text).toBe("canonical diagnostic");
  });

  test("blocks prompt assembly after an unexpected render failure", async () => {
    const failure = new Error("read failed");
    core.loadMemorySnapshot.mockRejectedValue(failure);
    const agent = createAgent("/project");
    const runtime = createRuntime();
    apply(runtime.context);

    await expect(runtime.assemble(agent)).rejects.toThrow(failure);
    await expect(runtime.assemble(agent)).rejects.toThrow(failure);
    expect(core.loadMemorySnapshot).toHaveBeenCalledOnce();
  });
});

type TestAgent = {
  readonly session: { readonly header: { readonly cwd: string } };
};

type TestAssembly = {
  readonly sections: Array<{
    readonly name: string;
    readonly text: string;
    readonly interpolate?: boolean;
  }>;
  readonly contexts: unknown[];
  readonly tools: unknown[];
  readonly variables: Record<string, string | undefined>;
};

function createAgent(cwd: string): TestAgent {
  return { session: { header: { cwd } } };
}

function createRuntime(): {
  readonly context: Parameters<typeof apply>[0];
  readonly assemble: (agent: TestAgent | undefined) => Promise<TestAssembly>;
} {
  let assemble:
    | ((
        assembly: TestAssembly,
        context: { agent?: TestAgent },
        next: () => Promise<TestAssembly>,
      ) => Promise<TestAssembly>)
    | undefined;
  const context = {
    inject: vi.fn(),
    on: (event: string, handler: typeof assemble) => {
      if (event === "system-prompt/assemble") assemble = handler;
    },
  } as unknown as Parameters<typeof apply>[0];

  return {
    context,
    async assemble(agent) {
      if (assemble === undefined) throw new Error("system-prompt/assemble was not registered");
      const assembly: TestAssembly = {
        sections: [],
        contexts: [],
        tools: [],
        variables: {},
      };
      const assembleContext = agent === undefined ? {} : { agent };
      return assemble(assembly, assembleContext, () => Promise.resolve(assembly));
    },
  };
}
