import type { Context } from "@opencode/plugin/promise/plugin";
import type { CommandDefinition, CommandEditor } from "@opencode/plugin/promise/command";
import { expect, test, vi } from "vitest";

import { registerCommands } from "../src/commands.ts";

test.each([
  ["operator:user-init", "user init", "User Setup"],
  ["operator:project-init", "project init", "Project Setup"],
  ["operator:index", "index init", "Project Index Setup"],
  ["operator:repair", "memory check", "reported load failures"],
] as const)("hands %s to the agent without executing Helper", async (name, operation, guide) => {
  const definitions: CommandDefinition[] = [];
  const prompt = vi.fn();
  const context = {
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

  expect(prompt).toHaveBeenCalledOnce();
  expect(prompt).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionID: "session-one",
      delivery: "queue",
      text: expect.stringContaining(`2. Run \`operator-helper ${operation}\``),
    }),
  );
  const text = prompt.mock.calls[0]?.[0].text as string;
  expect(text).toContain("1. Run `operator-helper version`");
  expect(text).toContain("run `operator-helper upgrade` before continuing");
  expect(text).toContain(guide);
  expect(text).toContain("repair its installation and retry the failed command");
  expect(text).not.toContain("<operator-command>");
});

test("preserves existing user commands", async () => {
  const definitions: CommandDefinition[] = [];
  const context = {
    command: {
      list: () =>
        Promise.resolve({ data: [{ name: "operator:index", description: "User command" }] }),
      transform: async (callback: (editor: CommandEditor) => void) =>
        callback({ add: definition => definitions.push(definition) }),
    },
  } as unknown as Context;
  await registerCommands(context);

  expect(definitions.map(definition => definition.name)).not.toContain("operator:index");
  expect(definitions).toHaveLength(3);
});
