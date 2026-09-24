import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectDirectory = resolve(import.meta.dirname, "..");
const configDirectory = join(projectDirectory, ".opencode");
const plugin = "../packages/opencode-v2/dist";

await mkdir(configDirectory, { recursive: true });
await writeFile(
  join(configDirectory, "opencode.json"),
  `${JSON.stringify({ $schema: "https://opencode.ai/config.json", plugins: ["-aerovato.operator-memory", plugin] }, null, 2)}\n`,
);
console.log(`Configured local OpenCode plugin: ${plugin}`);
