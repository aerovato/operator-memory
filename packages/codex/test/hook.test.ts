import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, expect, test } from "vitest";

const hookPath = resolve(import.meta.dirname, "../src/hook.ts");
const temporaryDirectories: string[] = [];
const threadId = "12345678-1234-1234-1234-123456789abc";
const rolloutId = "12345678-1234-1234-1234-123456789abd";
const firstReplacementId = "12345678-1234-1234-1234-123456789abe";
const turnStarted = { type: "event_msg", payload: { type: "task_started" } };
const settings = {
  type: "event_msg",
  payload: { type: "thread_settings_applied", cwd: "/résumé" },
};
const preamble = {
  type: "response_item",
  payload: {
    type: "message",
    role: "developer",
    content: [{ type: "input_text", text: '<operator-guidance version="2.1">Example' }],
    internal_chat_message_metadata_passthrough: {
      content_item_kinds: ["hooks.additional_context"],
    },
  },
};
const initialContext = {
  type: "response_item",
  payload: {
    ...preamble.payload,
    content: [{ type: "input_text", text: "Codex project instructions" }],
    internal_chat_message_metadata_passthrough: {
      content_item_kinds: ["generic.developer_instructions"],
    },
  },
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })),
  );
});

test.each(["startup", "clear", "compact"])(
  "injects complete Helper output for SessionStart source %s",
  async source => {
    const projectDirectory = await temporaryDirectory("operator-codex-project-");
    const binDirectory = await helperBin(false);
    const output = runHook(
      { hook_event_name: "SessionStart", source, cwd: projectDirectory },
      binDirectory,
    );

    expect(output.status).toBe(0);
    expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
  },
);

test.each(["resume", "fork"])("skips %s when the transcript is unavailable", async source => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const output = runHook(
    { hook_event_name: "SessionStart", source, cwd: projectDirectory },
    binDirectory,
  );

  expect(output.status).toBe(0);
  expect(output.stdout).toBe("");
});

test.each(["resume", "fork"])("recovers on %s with an empty retained prefix", async source => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);
  await writeFile(transcript, rollout(null, [settings, turnStarted, initialContext]));

  const output = runHook(recoveryEvent(source, projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
});

test("recovers when another hook has contributed context to the first turn", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);
  const otherHookContext = {
    ...preamble,
    payload: {
      ...preamble.payload,
      content: [{ type: "input_text", text: "Another hook's developer context" }],
    },
  };
  await writeFile(transcript, rollout(null, [turnStarted, initialContext, otherHookContext]));

  const output = runHook(recoveryEvent("resume", projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
});

test("recovers across repeated reverts without reading the discarded suffix", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const original = await rolloutPath(projectDirectory, threadId, true);
  const replacement = await rolloutPath(projectDirectory, firstReplacementId, false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);

  const originalPrefix = rollout(null, [settings]);
  const originalBase = {
    thread_id: threadId,
    end_ordinal_exclusive: 2,
    end_byte_offset: Buffer.byteLength(originalPrefix),
  };
  await writeFile(original, rollout(null, [settings, turnStarted, preamble]));

  const replacementPrefix = rollout(originalBase, [settings]);
  const replacementBase = {
    thread_id: firstReplacementId,
    end_ordinal_exclusive: 4,
    end_byte_offset: Buffer.byteLength(replacementPrefix),
  };
  await writeFile(replacement, rollout(originalBase, [settings, turnStarted, preamble]));
  await writeFile(transcript, rollout(replacementBase, [turnStarted, initialContext]));

  const output = runHook(recoveryEvent("resume", projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
});

test("skips a fork whose inherited prefix still contains the preamble", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const original = await rolloutPath(projectDirectory, threadId, false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);
  const originalPrefix = rollout(null, [turnStarted, preamble]);
  await writeFile(original, originalPrefix);
  await writeFile(
    transcript,
    rollout(
      {
        thread_id: threadId,
        end_ordinal_exclusive: 3,
        end_byte_offset: Buffer.byteLength(originalPrefix),
      },
      [turnStarted, initialContext],
    ),
  );

  const output = runHook(recoveryEvent("fork", projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe("");
});

test("skips recovery when the inherited rollout is missing", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);
  await writeFile(
    transcript,
    rollout({ thread_id: firstReplacementId, end_ordinal_exclusive: 2, end_byte_offset: 300 }, [
      turnStarted,
      initialContext,
    ]),
  );

  const output = runHook(recoveryEvent("resume", projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe("");
});

test.each([
  [
    "an unannotated preamble in the current turn",
    [
      turnStarted,
      {
        ...preamble,
        payload: {
          type: "message",
          role: "developer",
          content: preamble.payload.content,
        },
      },
    ],
  ],
  ["a prior turn", [turnStarted, turnStarted]],
  ["a compaction", [{ type: "compacted", payload: {} }, turnStarted]],
  ["an unsupported record", [{ type: "unrecognized", payload: {} }, turnStarted]],
])("skips a resume with %s", async (_scenario, records) => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const transcript = await rolloutPath(projectDirectory, rolloutId, false);
  await writeFile(transcript, rollout(null, records));

  const output = runHook(recoveryEvent("resume", projectDirectory, transcript), binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe("");
});

test("injects complete Helper output for delegated subagents", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(false);
  const output = runHook({ hook_event_name: "SubagentStart", cwd: projectDirectory }, binDirectory);

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(JSON.stringify({ cwd: projectDirectory, arguments: ["preamble"] }));
});

test("returns a blocking user-visible failure when Helper fails", async () => {
  const projectDirectory = await temporaryDirectory("operator-codex-project-");
  const binDirectory = await helperBin(true);
  const output = runHook(
    { hook_event_name: "SessionStart", source: "startup", cwd: projectDirectory },
    binDirectory,
  );

  expect(output.status).toBe(0);
  expect(output.stdout).toBe(
    JSON.stringify({
      continue: false,
      systemMessage: "Operator could not load memory because operator-helper preamble failed.",
    }),
  );
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  temporaryDirectories.push(directory);
  return directory;
}

type HistoryBase = {
  readonly thread_id: string;
  readonly end_ordinal_exclusive: number;
  readonly end_byte_offset: number;
};

function rollout(historyBase: HistoryBase | null, rows: readonly object[]): string {
  const header = {
    type: "session_meta",
    payload: { id: threadId, history_mode: "paginated", history_base: historyBase },
  };
  return `${[header, ...rows]
    .map((row, index) =>
      JSON.stringify({
        ...row,
        ordinal: (historyBase?.end_ordinal_exclusive ?? 0) + index,
      }),
    )
    .join("\n")}\n`;
}

async function rolloutPath(directory: string, id: string, archived: boolean): Promise<string> {
  const store = archived
    ? join(directory, "archived_sessions")
    : join(directory, "sessions", "2026", "11", "25");
  await mkdir(store, { recursive: true });
  const suffix = id === threadId ? threadId : `${threadId}_${id}`;
  return join(store, `rollout-2026-11-25T09-00-00-${suffix}.jsonl`);
}

function recoveryEvent(
  source: string,
  cwd: string,
  transcript: string,
): Readonly<Record<string, string>> {
  return {
    hook_event_name: "SessionStart",
    source,
    cwd,
    session_id: threadId,
    transcript_path: transcript,
  };
}

async function helperBin(fail: boolean): Promise<string> {
  const directory = await temporaryDirectory("operator-codex-bin-");
  const helperPath = join(directory, "operator-helper");
  await writeFile(
    helperPath,
    `#!/usr/bin/env node
if (${JSON.stringify(fail)}) process.exit(1);
process.stdout.write(JSON.stringify({ cwd: process.cwd(), arguments: process.argv.slice(2) }));
`,
  );
  await chmod(helperPath, 0o755);
  return directory;
}

function runHook(
  event: Readonly<Record<string, string>>,
  binDirectory: string,
): ReturnType<typeof spawnSync> {
  return spawnSync("bun", [hookPath], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${binDirectory}:${process.env.PATH ?? ""}` },
    input: JSON.stringify(event),
  });
}
