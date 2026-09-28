import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { $ } from "bun";

const projectDirectory = resolve(import.meta.dirname, "..");
const configDirectory = join(projectDirectory, ".opencode");
const plugin = "../packages/opencode-v2/dist";

await $`bun run install:helper`.cwd(projectDirectory);
await $`bun run build:opencode-v2:dev`.cwd(projectDirectory);

await mkdir(configDirectory, { recursive: true });
await writeFile(
  join(configDirectory, "opencode.json"),
  `${JSON.stringify({ $schema: "https://opencode.ai/config.json", plugins: ["-aerovato.operator-memory", plugin] }, null, 2)}\n`,
);
console.log(`Configured local OpenCode plugin: ${plugin}`);
