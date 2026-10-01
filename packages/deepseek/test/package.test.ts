import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

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

  test("contributes a static Operator indicator beside the composer readings", async () => {
    const manifest = JSON.parse(
      await readFile(resolve(packageDirectory, "package.json"), "utf8"),
    ) as {
      version: string;
      exports: Record<string, string>;
      dsh: { client: { platform: string; inject: string[] } };
    };
    expect(manifest.exports["./client"]).toBe("./dist/client.js");
    expect(manifest.dsh.client).toEqual({
      platform: "web",
      inject: ["@deepseek-ai/dsh-client-ui-conversation"],
    });

    type Element = {
      type: string;
      props: Record<string, unknown>;
      children: Array<Element | string>;
    };
    type ClientPlugin = {
      inject: string[];
      apply: (context: {
        effect: (register: () => () => void, label: string) => void;
        slots: {
          inject: (name: string, register: () => unknown) => void;
          register: (options: Record<string, unknown>, component: () => Element) => unknown;
        };
      }) => void;
    };
    let plugin: ClientPlugin | undefined;
    const css = await readFile(resolve(packageDirectory, "src/client.css"), "utf8");
    const source = (await readFile(resolve(packageDirectory, "src/client.js"), "utf8"))
      .replace("__OPERATOR_VERSION__", manifest.version)
      .replace('"__OPERATOR_CSS__"', JSON.stringify(css));
    const style = { textContent: "", remove: vi.fn() };
    const appendChild = vi.fn();
    runInNewContext(source, {
      document: { createElement: vi.fn(() => style), head: { appendChild } },
      window: {
        __ModuleLoader__: {
          load: ({
            id,
            factory,
          }: {
            id: string;
            factory: (require: (id: string) => unknown) => ClientPlugin;
          }) => {
            expect(id).toBe("@aerovato/operator-deepseek");
            plugin = factory(id => {
              expect(id).toBe("react");
              return {
                createElement: (
                  type: string,
                  props: Record<string, unknown>,
                  ...children: Array<Element | string>
                ) => ({ type, props, children }),
              };
            });
          },
        },
      },
    });

    const register = vi.fn();
    const injectSlot = vi.fn((_name: string, callback: () => unknown) => callback());
    const effect = vi.fn((callback: () => () => void) => callback());
    expect(plugin?.inject).toEqual(["slots"]);
    plugin?.apply({ effect, slots: { inject: injectSlot, register } });
    expect(effect).toHaveBeenCalledWith(expect.any(Function), "operator-memory: indicator style");
    expect(style.textContent).toBe(css);
    expect(appendChild).toHaveBeenCalledWith(style);
    expect(css).toContain("border: none");
    expect(css).toContain(".operator-memory-indicator:hover");
    expect(css).toContain("background: var(--dsw-alias-interactive-bg-hover)");
    expect(css).toContain("color: var(--dsw-alias-label-secondary)");
    expect(css).toContain("user-select: none");
    expect(injectSlot).toHaveBeenCalledWith("conversation.composer.dock", expect.any(Function));
    expect(register).toHaveBeenCalledWith(
      { name: "conversation.composer.dock", id: "operator-memory", order: -1 },
      expect.any(Function),
    );
    const indicator = (register.mock.calls[0][1] as () => Element)();
    expect(indicator.type).toBe("span");
    expect(indicator.props.className).toBe("operator-memory-indicator");
    expect(indicator.children).toEqual([
      {
        type: "span",
        props: { className: "operator-memory-indicator__label" },
        children: [`Operator Ready (v${manifest.version})`],
      },
    ]);
    (effect.mock.results[0].value as () => void)();
    expect(style.remove).toHaveBeenCalledOnce();
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
