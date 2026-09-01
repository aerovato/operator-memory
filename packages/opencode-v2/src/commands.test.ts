import { EventEmitter } from "node:events";

import type { Context } from "@opencode-ai/plugin/promise/plugin";
import type { CommandDefinition, CommandDraft } from "@opencode-ai/plugin/promise/command";
import { expect, test, vi } from "vitest";

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));

vi.mock("node:child_process", () => ({ spawn }));

import { registerCommands } from "./commands.ts";

test("runs Helper operations in order and admits their output", async () => {
  spawn.mockImplementation((command: string) => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(command));
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
      transform: async (callback: (draft: CommandDraft) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
    session: { prompt },
  } as unknown as Context;

  await registerCommands(context);
  await definitions
    .find(definition => definition.name === "operator:user-init")
    ?.execute({
      sessionID: "session-one",
      prompt: { text: "" },
      delivery: "queue",
    } as Parameters<CommandDefinition["execute"]>[0]);

  expect(spawn.mock.calls.map(([command]) => command)).toEqual([
    "operator-helper version 2>&1",
    "operator-helper user init 2>&1",
    "operator-helper user guide 2>&1",
  ]);
  expect(prompt).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionID: "session-one",
      delivery: "queue",
      text: expect.stringContaining("<command>operator-helper user guide 2>&1</command>"),
    }),
  );
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
      transform: async (callback: (draft: CommandDraft) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
  } as unknown as Context;

  await registerCommands(context);

  expect(definitions.map(definition => definition.name)).not.toContain("operator:index");
  expect(definitions).toHaveLength(3);
});
