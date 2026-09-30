import { spawn } from "node:child_process";

import type { Context } from "@deepseek-ai/cordis";

/** Cordis plugin name used by DeepSeek Harness diagnostics. */
export const name = "operator-memory";

/** Start the Operator Host plugin for this DeepSeek Harness runtime. */
export function apply(_context: Context): void {
  startHelperUpdate();
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
