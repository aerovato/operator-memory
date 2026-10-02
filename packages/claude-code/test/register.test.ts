import { describe, expect, it, vi } from "vitest";
import type { Events, Hook, ModApi, On, PromptSection } from "../src/types";

async function harness() {
  vi.resetModules();
  const { register } = await import("../src/register");
  const handlers = new Map<keyof Events, unknown>();
  const on: On = (name, handler) => {
    handlers.set(name, handler);
  };
  register(on);

  const run = vi.fn<ModApi["process"]["run"]>().mockResolvedValue({
    exitCode: 0,
    stdout: "<operator>memory</operator>\n\n",
    stderr: "",
  });
  const $: ModApi = {
    process: { run },
    session: { cwd: vi.fn().mockResolvedValue("/project") },
    ui: { log: vi.fn() },
  };
  function hook<Name extends keyof Events>(name: Name): Hook<Name> {
    return handlers.get(name) as Hook<Name>;
  }
  return { $, run, hook };
}

describe("preamble injection", () => {
  it("appends a session section and preserves the engine sections", async () => {
    const { $, run, hook } = await harness();
    const section: PromptSection = { id: "intro", text: "Claude", scope: "shared" };
    const result = await hook("prompt.compose")($, {}, async () => ({ sections: [section] }));

    expect(result.sections).toEqual([
      section,
      { id: "operator:preamble", text: "<operator>memory</operator>\n\n", scope: "session" },
    ]);
    expect(run).toHaveBeenCalledExactlyOnceWith(["operator-helper", "preamble"], {
      cwd: "/project",
    });
  });

  it("coalesces concurrent compose and spawn renders and keeps the cached bytes", async () => {
    const { $, run, hook } = await harness();
    const next = vi.fn().mockResolvedValue({ agentId: "child" });
    const event = Object.freeze({ prompt: "Task", model: "haiku", background: true });
    const compose = () => hook("prompt.compose")($, {}, async () => ({ sections: [] }));

    const [first] = await Promise.all([compose(), hook("agent.spawn")($, event, next)]);
    const second = await compose();

    expect(run).toHaveBeenCalledTimes(1);
    expect($.session.cwd).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(next).toHaveBeenCalledWith({
      ...event,
      prompt: "<operator>memory</operator>\n\nTask",
    });
    expect(event.prompt).toBe("Task");
  });

  it("allows a subagent to trigger the first render", async () => {
    const { $, run, hook } = await harness();
    const next = vi.fn().mockResolvedValue({ agentId: "child" });

    await hook("agent.spawn")($, { prompt: "Task" }, next);
    await hook("prompt.compose")($, {}, async () => ({ sections: [] }));

    expect(run).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ prompt: "<operator>memory</operator>\n\nTask" });
  });

  it("passes canonical diagnostic output through unchanged", async () => {
    const { $, run, hook } = await harness();
    const diagnostic = "<operator-diagnostic>Repair memory</operator-diagnostic>\n";
    run.mockResolvedValue({ exitCode: 0, stdout: diagnostic, stderr: "" });

    const result = await hook("prompt.compose")($, {}, async () => ({ sections: [] }));
    const next = vi.fn().mockResolvedValue({ agentId: "child" });
    await hook("agent.spawn")($, { prompt: "Task" }, next);

    expect(result.sections[0]?.text).toBe(diagnostic);
    expect(next).toHaveBeenCalledWith({ prompt: `${diagnostic}Task` });
    expect($.ui.log).not.toHaveBeenCalled();
  });

  it.each(["nonzero", "missing"])("caches %s failure and logs one recovery cue", async failure => {
    const { $, run, hook } = await harness();
    if (failure === "missing") run.mockRejectedValue(new Error("ENOENT"));
    else run.mockResolvedValue({ exitCode: 1, stdout: "partial output", stderr: "failed" });
    const original = { sections: [] };
    const compose = () => hook("prompt.compose")($, {}, async () => original);
    const next = vi.fn().mockResolvedValue({ agentId: "child" });
    const event = Object.freeze({ prompt: "Task" });

    const [result] = await Promise.all([compose(), hook("agent.spawn")($, event, next)]);
    await compose();

    expect(result).toBe(original);
    expect(next).toHaveBeenCalledWith(event);
    expect(run).toHaveBeenCalledTimes(1);
    expect($.ui.log).toHaveBeenCalledTimes(1);
    expect($.ui.log).toHaveBeenCalledWith(expect.stringContaining("restart Claude Code"));
  });
});

describe("runtime launch", () => {
  it("starts the version check without waiting or rendering the preamble", async () => {
    const { $, run, hook } = await harness();
    run.mockReturnValue(new Promise(() => {}));
    const next = vi.fn().mockResolvedValue({ cwd: "/project" });
    const event = { cwd: "/project" };

    expect(await hook("session.start")($, event, next)).toEqual({ cwd: "/project" });
    expect(run).toHaveBeenCalledExactlyOnceWith(["operator-helper", "version"], undefined);
    expect(next).toHaveBeenCalledWith(event);
    expect($.session.cwd).not.toHaveBeenCalled();
  });

  it("ignores a failed automatic update check", async () => {
    const { $, run, hook } = await harness();
    run.mockRejectedValue(new Error("ENOENT"));

    await hook("session.start")($, {}, async () => ({}));

    expect($.ui.log).not.toHaveBeenCalled();
  });
});
