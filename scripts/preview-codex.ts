import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { $ } from "bun";

const projectDirectory = resolve(import.meta.dirname, "..");
const plugin = "aerovato@operator-local";
const marketplaceRoot = join(projectDirectory, ".cache", "codex-marketplace");
const marketplaceDirectory = join(marketplaceRoot, ".agents", "plugins");

await $`bun run install:helper`.cwd(projectDirectory);
await $`bun run build:codex`.cwd(projectDirectory);

await mkdir(marketplaceDirectory, { recursive: true });
await writeFile(
  join(marketplaceDirectory, "marketplace.json"),
  `${JSON.stringify(
    {
      name: "operator-local",
      interface: { displayName: "Operator Memory — Local Development" },
      plugins: [
        {
          name: "aerovato",
          source: join(projectDirectory, "packages", "codex"),
          policy: { installation: "AVAILABLE" },
        },
      ],
    },
    null,
    2,
  )}\n`,
);

const removal = spawnSync("codex", ["plugin", "marketplace", "remove", "operator-local"], {
  cwd: projectDirectory,
  encoding: "utf8",
});
if (removal.error !== undefined) throw removal.error;
if (
  removal.status !== 0
  && !removal.stderr.includes("marketplace `operator-local` is not configured or installed")
) {
  throw new Error(removal.stderr || "Could not reset the local Codex marketplace");
}

const marketplace = spawnSync("codex", ["plugin", "marketplace", "add", marketplaceRoot], {
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
