import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const projectDirectory = resolve(import.meta.dirname, "..");
const packageDirectory = join(projectDirectory, "packages", "opencode");
const plugin = `@aerovato/operator-opencode@${pathToFileURL(packageDirectory).href}`;
const installation = spawnSync("opencode", ["plugin", plugin, "--global", "--force"], {
  cwd: projectDirectory,
  stdio: "inherit",
});

if (installation.error !== undefined) {
  throw installation.error;
}
process.exitCode = installation.status ?? 1;
