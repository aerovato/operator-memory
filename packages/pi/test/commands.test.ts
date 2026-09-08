import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";

import { OPERATOR_COMMAND_NAMES, registerCommands } from "../src/commands.ts";

type CommandHandler = (
  arguments_: string,
  context: { readonly cwd: string; readonly waitForIdle: () => Promise<void> },
) => Promise<void>;

const operationArguments = {
  "operator:user-init": ["user init", "user guide"],
  "operator:project-init": ["project init", "project guide"],
  "operator:index": ["index status", "index guide"],
  "operator:repair": ["memory check"],
} as const;

test.each(OPERATOR_COMMAND_NAMES)("runs %s Helper operations in order", async name => {
  const extension = createExtension();
  extension.exec.mockResolvedValue({ stdout: "output", stderr: "", code: 0, killed: false });

  await extension.commands.get(name)?.("", extension.context);

  expect(extension.context.waitForIdle).toHaveBeenCalledOnce();
  expect(extension.exec.mock.calls.map(([, arguments_]) => arguments_.join(" "))).toEqual([
    "version",
    ...operationArguments[name],
  ]);
  expect(extension.sendUserMessage).toHaveBeenCalledWith(expect.any(String), {
    expandPromptTemplates: false,
  });
});

test("frames stdout, stderr, and exit code without a shell", async () => {
  const extension = createExtension();
  extension.exec
    .mockResolvedValueOnce({ stdout: "version", stderr: "", code: 0, killed: false })
    .mockResolvedValueOnce({ stdout: "created\n", stderr: "warning\n", code: 1, killed: false })
    .mockResolvedValueOnce({ stdout: "guide", stderr: "", code: 0, killed: false });

  await extension.commands.get("operator:user-init")?.("", extension.context);

  expect(extension.exec).toHaveBeenNthCalledWith(2, "operator-helper", ["user", "init"], {
    cwd: "/project",
  });
  const prompt = extension.sendUserMessage.mock.calls[0]?.[0];
  expect(prompt).toContain(
    [
      "<operator-command>",
      "<command>operator-helper user init</command>",
      "<output>",
      "<stdout>",
      "created",
      "</stdout>",
      "<stderr>",
      "warning",
      "</stderr>",
      "<code>1</code>",
      "</output>",
      "</operator-command>",
    ].join("\n"),
  );
  expect(prompt).toContain("<command>operator-helper user guide</command>");
  expect(prompt).toContain("<operator-instructions>");
});

test("reports Helper unavailability and skips normal operations", async () => {
  const extension = createExtension();
  extension.exec.mockResolvedValue({
    stdout: "",
    stderr: "operator-helper not found",
    code: 127,
    killed: false,
  });

  await extension.commands.get("operator:index")?.("", extension.context);

  expect(extension.exec).toHaveBeenCalledOnce();
  expect(extension.sendUserMessage).toHaveBeenCalledWith(
    expect.stringContaining("ask the user to rerun `/operator:index`"),
    { expandPromptTemplates: false },
  );
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
});

function createExtension() {
  const commands = new Map<string, CommandHandler>();
  const exec = vi.fn();
  const sendUserMessage = vi.fn();
  registerCommands({
    registerCommand: (name: string, definition: { readonly handler: CommandHandler }) =>
      commands.set(name, definition.handler),
    exec,
    sendUserMessage,
  } as unknown as ExtensionAPI);
  return {
    commands,
    context: { cwd: "/project", waitForIdle: vi.fn().mockResolvedValue(undefined) },
    exec,
    sendUserMessage,
  };
}
