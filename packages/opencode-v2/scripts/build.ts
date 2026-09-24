import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

import solidPlugin from "@opentui/solid/bun-plugin";

const packageDirectory = resolve(import.meta.dir, "..");
const outputDirectory = join(packageDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
const build = await Bun.build({
  entrypoints: [
    join(packageDirectory, "src", "index.ts"),
    join(packageDirectory, "src", "server.ts"),
    join(packageDirectory, "src", "notifications.ts"),
    join(packageDirectory, "src", "tui.tsx"),
  ],
  outdir: outputDirectory,
  target: "node",
  format: "esm",
  sourcemap: "external",
  plugins: [solidPlugin],
  external: ["@opencode/plugin", "@opentui/core", "@opentui/solid", "solid-js"],
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
