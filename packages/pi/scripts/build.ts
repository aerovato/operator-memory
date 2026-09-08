import { rm } from "node:fs/promises";
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
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-tui",
    "typebox",
  ],
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
