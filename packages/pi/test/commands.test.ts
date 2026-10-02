import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";

import { OPERATOR_COMMAND_NAMES, registerCommands } from "../src/commands.ts";

type CommandHandler = (
  arguments_: string,
  context: { readonly waitForIdle: () => Promise<void> },
) => Promise<void>;

test.each([
  ["operator:user-init", "user init", "User Setup"],
  ["operator:project-init", "project init", "Project Setup"],
  ["operator:index", "index init", "Project Index Setup"],
  ["operator:repair", "memory check", "reported load failures"],
] as const)("hands %s to the agent without executing Helper", async (name, operation, guide) => {
  const commands = new Map<string, CommandHandler>();
  const sendUserMessage = vi.fn();
  registerCommands({
    registerCommand: (id: string, definition: { readonly handler: CommandHandler }) =>
      commands.set(id, definition.handler),
    sendUserMessage,
  } as unknown as ExtensionAPI);
  const waitForIdle = vi.fn().mockResolvedValue(undefined);

  await commands.get(name)?.("", { waitForIdle });

  expect(waitForIdle).toHaveBeenCalledOnce();
  expect(sendUserMessage).toHaveBeenCalledWith(expect.any(String), {
    expandPromptTemplates: false,
  });
  const text = sendUserMessage.mock.calls[0]?.[0] as string;
  expect(text).toContain("1. Run `operator-helper version`");
  expect(text).toContain("run `operator-helper upgrade` before continuing");
  expect(text).toContain(`2. Run \`operator-helper ${operation}\``);
  expect(text).toContain(guide);
  expect(text).toContain("npm package `@aerovato/operator-helper` globally");
  expect(text).not.toContain("<operator-command>");
});

test("registers exact names and leaves duplicate renaming to Pi", () => {
  const registered = new Set<string>(["operator:index"]);
  const names: string[] = [];
  const pi = {
    registerCommand: (name: string) => {
      const registeredName = registered.has(name) ? `${name}:1` : name;
      registered.add(registeredName);
      names.push(registeredName);
    },
  } as unknown as ExtensionAPI;
  registerCommands(pi);

  expect(names).toEqual([
    "operator:user-init",
    "operator:project-init",
    "operator:index:1",
    "operator:repair",
  ]);
  expect(OPERATOR_COMMAND_NAMES).toHaveLength(4);
});
