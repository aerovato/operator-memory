import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { $ } from "bun";

const projectDirectory = resolve(import.meta.dirname, "..");

await $`bun run install:helper`.cwd(projectDirectory);
await $`bun run build:claude-code`.cwd(projectDirectory);

const session = spawnSync(
  "claude",
  ["--plugin-dir", resolve(projectDirectory, "packages/claude-code")],
  { cwd: projectDirectory, stdio: "inherit" },
);

if (session.error !== undefined) {
  throw session.error;
}
process.exitCode = session.status ?? 1;
