import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { $ } from "bun";

const projectDirectory = resolve(import.meta.dirname, "..");
const plugin = "aerovato@operator-local";

await $`bun run install:helper`.cwd(projectDirectory);
await $`bun run build:codex`.cwd(projectDirectory);

const marketplace = spawnSync("codex", ["plugin", "marketplace", "add", projectDirectory], {
  cwd: projectDirectory,
  stdio: "inherit",
});

if (marketplace.error !== undefined) {
  throw marketplace.error;
}
if (marketplace.status !== 0) {
  process.exitCode = marketplace.status ?? 1;
} else {
  const installation = spawnSync("codex", ["plugin", "add", plugin], {
    cwd: projectDirectory,
    stdio: "inherit",
  });

  if (installation.error !== undefined) {
    throw installation.error;
  }
  process.exitCode = installation.status ?? 1;
  if (installation.status === 0) {
    console.log(`Installed local Codex plugin: ${plugin}`);
    console.log("Start a fresh Codex session and approve the Operator hooks when prompted.");
  }
}
