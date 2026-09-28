import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

import solidPlugin from "@opentui/solid/bun-plugin";

const packageDirectory = resolve(import.meta.dir, "..");
const outputDirectory = join(packageDirectory, "dist");
const pluginId = process.env.OPERATOR_PLUGIN_ID ?? "aerovato.operator-memory";

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
  define: { __OPERATOR_PLUGIN_ID__: JSON.stringify(pluginId) },
  external: ["@opencode/plugin", "@opentui/core", "@opentui/solid", "solid-js"],
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
