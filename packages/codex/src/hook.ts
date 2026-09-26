import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

type HookEvent = {
  readonly cwd: string;
  readonly hookEventName: string | null;
  readonly source: string | null;
};

const SESSION_SOURCES: ReadonlySet<string> = new Set(["startup", "clear", "compact"]);
const FAILURE_MESSAGE = "Operator could not load memory because operator-helper preamble failed.";

function fail(): never {
  process.stdout.write(JSON.stringify({ continue: false, systemMessage: FAILURE_MESSAGE }));
  process.exit(0);
}

function readEvent(): HookEvent {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    if (typeof value !== "object" || value === null) return fail();

    const fields = value as Record<string, unknown>;
    if (typeof fields.cwd !== "string" || fields.cwd.length === 0) return fail();

    return {
      cwd: fields.cwd,
      hookEventName: typeof fields.hook_event_name === "string" ? fields.hook_event_name : null,
      source: typeof fields.source === "string" ? fields.source : null,
    };
  } catch {
    return fail();
  }
}

function main(): void {
  const event = readEvent();
  if (event.hookEventName === "SessionStart" && !SESSION_SOURCES.has(event.source ?? "")) return;

  const result = spawnSync("operator-helper", ["preamble"], {
    cwd: event.cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error !== undefined || result.status !== 0 || result.stdout.length === 0) fail();
  process.stdout.write(result.stdout);
}

main();
