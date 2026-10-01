import { spawn } from "node:child_process";
import { homedir } from "node:os";

import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import { renderPreamble } from "@aerovato/operator-core/preamble";
import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";

import { registerCommands } from "./commands.ts";

/** Cordis plugin name used by DeepSeek Harness diagnostics. */
export const name = "operator-memory";

/** Service required for asynchronous system-prompt contribution. */
export const inject = ["systemPrompt"];

/** Start the Operator Host plugin for this DeepSeek Harness runtime. */
export function apply(context: Context): void {
  startHelperUpdate();
  context.inject(["commands"], registerCommands);

  const renders = new WeakMap<Agent, Promise<string>>();
  context.on("system-prompt/assemble", async (assembly, { agent }, next) => {
    if (agent === undefined) return next();

    const pending = renders.get(agent) ?? renderAgentPreamble(agent);
    renders.set(agent, pending);
    assembly.sections.unshift({
      name: "operator:memory",
      text: await pending,
      interpolate: false,
    });
    return next();
  });
}

async function renderAgentPreamble(agent: Agent): Promise<string> {
  const projectDirectory = agent.session.header.cwd ?? process.cwd();
  const memory = await loadMemorySnapshot(projectDirectory, homedir(), true);
  return renderPreamble(memory).content;
}

function startHelperUpdate(): void {
  const environment = { ...process.env };
  delete environment.OPERATOR_HELPER_SKIP_UPDATE;
  try {
    const child = spawn("operator-helper", ["version"], {
      detached: true,
      env: environment,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // The installed plugin remains usable when Helper is unavailable.
  }
}
