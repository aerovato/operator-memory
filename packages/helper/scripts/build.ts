import { copyFile, mkdir, rm } from "node:fs/promises";
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
});

if (!build.success) {
  for (const log of build.logs) {
    console.error(log);
  }
  process.exit(1);
}

const codePuppyOutput = join(outputDirectory, "code-puppy");
await mkdir(codePuppyOutput);
await copyFile(
  resolve(packageDirectory, "..", "code-puppy", "operator", "register_callbacks.py"),
  join(codePuppyOutput, "register_callbacks.py"),
);
