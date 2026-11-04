import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, expect, test } from "vitest";

const directories: string[] = [];
const definitions: {
  hooks: Record<string, { hooks: { command: string; commandWindows: string }[] }[]>;
} = JSON.parse(await readFile(resolve(import.meta.dirname, "../hooks/hooks.json"), "utf8"));
const shells =
  process.platform === "win32"
    ? [process.env.COMSPEC || "cmd.exe"]
    : ["/bin/sh", "/bin/bash", "/bin/zsh"].filter(existsSync);

afterEach(async () => {
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

for (const [event, groups] of Object.entries(definitions.hooks)) {
  for (const shell of shells) {
    test.each([0, 23])(
      `${event} command preserves streams and exit code %s through ${shell}`,
      async exitCode => {
        const root = await mkdtemp(join(tmpdir(), "operator plugin with spaces "));
        directories.push(root);
        await mkdir(join(root, "dist"));
        await writeFile(
          join(root, "dist/hook.js"),
          `
process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", chunk => { input += chunk; });
process.stdin.on("end", () => {
  process.stdout.write(input);
  process.stderr.write("hook stderr");
  process.exitCode = Number(process.env.OPERATOR_TEST_EXIT_CODE);
});
`,
        );
        const handler = groups[0]?.hooks[0];
        expect(handler).toBeDefined();
        if (handler === undefined) return;
        const windows = process.platform === "win32";
        const command = windows ? handler.commandWindows : handler.command;
        const input = JSON.stringify({ hook_event_name: event, cwd: root });
        const result = spawnSync(shell, windows ? ["/C", `"${command}"`] : ["-lc", command], {
          encoding: "utf8",
          env: { ...process.env, PLUGIN_ROOT: root, OPERATOR_TEST_EXIT_CODE: String(exitCode) },
          input,
          windowsVerbatimArguments: windows,
        });
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(exitCode);
        expect(result.stdout).toBe(input);
        expect(result.stderr).toBe("hook stderr");
      },
    );
  }
}
