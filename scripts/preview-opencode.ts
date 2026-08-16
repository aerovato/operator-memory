import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const projectDirectory = resolve(import.meta.dirname, "..");
const packageDirectory = join(projectDirectory, "packages", "opencode");
const configDirectory = join(projectDirectory, ".opencode");
const plugin = `@aerovato/operator-opencode@${pathToFileURL(packageDirectory).href}`;
const configurations = [
  { file: "opencode.json", schema: "https://opencode.ai/config.json" },
  { file: "tui.json", schema: "https://opencode.ai/tui.json" },
] as const;

await mkdir(configDirectory, { recursive: true });
await Promise.all(
  configurations.map(configuration =>
    writeFile(
      join(configDirectory, configuration.file),
      `${JSON.stringify({ $schema: configuration.schema, plugin: [plugin] }, null, 2)}\n`,
    ),
  ),
);

console.log(`Configured local OpenCode plugin: ${plugin}`);
