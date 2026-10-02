import { EventEmitter } from "node:events";

import type { Context } from "@opencode/plugin/promise/plugin";
import type { CommandDefinition, CommandEditor } from "@opencode/plugin/promise/command";
import { beforeEach, expect, test, vi } from "vitest";

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));

vi.mock("node:child_process", () => ({ spawn }));

import { registerCommands } from "../src/commands.ts";

beforeEach(() => {
  spawn.mockReset();
});

test.each([
  ["operator:user-init", ["user", "init"]],
  ["operator:project-init", ["project", "init"]],
  ["operator:index", ["index", "init"]],
  ["operator:repair", ["memory", "check"]],
] as const)("runs one Helper operation for %s and admits its output", async (name, arguments_) => {
  spawn.mockImplementation(() => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from("result\n# Setup guide"));
      child.emit("close", 0);
    });
    return child;
  });
  const definitions: CommandDefinition[] = [];
  const prompt = vi.fn();
  const context = {
    location: { directory: "/project" },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: async (callback: (editor: CommandEditor) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
    session: { prompt },
  } as unknown as Context;

  await registerCommands(context);
  await definitions
    .find(definition => definition.name === name)
    ?.execute({
      sessionID: "session-one",
      prompt: { text: "" },
      delivery: "queue",
    } as Parameters<CommandDefinition["execute"]>[0]);

  expect(spawn).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledWith("operator-helper", [...arguments_], {
    cwd: "/project",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  expect(prompt).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionID: "session-one",
      delivery: "queue",
      text: expect.stringContaining("# Setup guide\n</output>\n</operator-command>"),
    }),
  );
  expect(prompt.mock.calls[0]?.[0].text).toContain(
    `<command>operator-helper ${arguments_.join(" ")}</command>`,
  );
});

test.each([
  { name: "operator:index", error: null, output: "Inspection failed\n# Project Index Setup" },
  { name: "operator:user-init", error: "ENOENT", output: "operator-helper not found" },
] as const)("preserves the requested command output for $name", async ({ name, error, output }) => {
  spawn.mockImplementation(() => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      if (error === null) {
        child.stdout.emit("data", Buffer.from(output));
        child.stderr.emit("data", Buffer.from("details"));
        child.emit("close", 1);
      } else {
        child.emit("error", Object.assign(new Error(output), { code: error }));
      }
    });
    return child;
  });
  const definitions: CommandDefinition[] = [];
  const prompt = vi.fn();
  const context = {
    location: { directory: "/project" },
    command: {
      list: () => Promise.resolve({ data: [], location: { directory: "/project" } }),
      transform: async (callback: (editor: CommandEditor) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
    session: { prompt },
  } as unknown as Context;

  await registerCommands(context);
  await definitions
    .find(definition => definition.name === name)
    ?.execute({
      sessionID: "session-one",
      prompt: { text: "" },
      delivery: "queue",
    } as Parameters<CommandDefinition["execute"]>[0]);

  const text = prompt.mock.calls[0]?.[0].text as string;
  expect(text).toContain(output);
  expect(text).toContain(
    `<command>operator-helper ${name === "operator:index" ? "index init" : "user init"}</command>`,
  );
  expect(text).toContain(error === null ? "<operator-instructions>" : "<operator-diagnostic>");
  expect(text).not.toContain(error === null ? "<operator-diagnostic>" : "<operator-instructions>");
  expect(spawn).toHaveBeenCalledOnce();
});

test("preserves existing user commands", async () => {
  const definitions: CommandDefinition[] = [];
  const context = {
    location: { directory: "/project" },
    command: {
      list: () =>
        Promise.resolve({
          data: [{ name: "operator:index", description: "User command" }],
          location: { directory: "/project" },
        }),
      transform: async (callback: (editor: CommandEditor) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
  } as unknown as Context;

  await registerCommands(context);

  expect(definitions.map(definition => definition.name)).not.toContain("operator:index");
  expect(definitions).toHaveLength(3);
});
