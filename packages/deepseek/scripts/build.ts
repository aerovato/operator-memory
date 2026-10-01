import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const packageDirectory = resolve(import.meta.dir, "..");
const outputDirectory = join(packageDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
const build = await Bun.build({
  entrypoints: [join(packageDirectory, "src", "index.ts")],
  outdir: outputDirectory,
  target: "node",
  format: "esm",
  sourcemap: "external",
  external: [
    "@deepseek-ai/cordis",
    "@deepseek-ai/dsh",
    "@deepseek-ai/dsh-agent",
    "@deepseek-ai/dsh-commands",
    "@deepseek-ai/dsh-llm",
    "@deepseek-ai/dsh-system-prompt",
  ],
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8")) as {
  version: string;
};
const client = await readFile(join(packageDirectory, "src", "client.js"), "utf8");
const css = await readFile(join(packageDirectory, "src", "client.css"), "utf8");
await writeFile(
  join(outputDirectory, "client.js"),
  client
    .replace("__OPERATOR_VERSION__", manifest.version)
    .replace('"__OPERATOR_CSS__"', JSON.stringify(css)),
);
