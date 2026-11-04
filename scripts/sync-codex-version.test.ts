import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";

import { syncCodexVersion } from "./sync-codex-version.ts";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

test("updates the plugin and npm catalog from the package version while preserving metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "operator-codex-release-"));
  roots.push(root);
  const pluginPath = join(root, "packages/codex/.codex-plugin/plugin.json");
  const catalogPath = join(root, ".agents/plugins/marketplace.json");
  await mkdir(join(root, "packages/codex/.codex-plugin"), { recursive: true });
  await mkdir(join(root, ".agents/plugins"), { recursive: true });
  await writeFile(join(root, "packages/codex/package.json"), JSON.stringify({ version: "0.4.0" }));
  await writeFile(
    pluginPath,
    JSON.stringify({ name: "aerovato", version: "0.1.0", hooks: "./hooks/hooks.json" }),
  );
  await writeFile(
    catalogPath,
    JSON.stringify({
      name: "operator-memory",
      plugins: [
        {
          name: "aerovato",
          source: { source: "npm", package: "@aerovato/operator-codex", version: "0.3.0" },
        },
      ],
    }),
  );

  await syncCodexVersion(root);

  expect(JSON.parse(await readFile(pluginPath, "utf8"))).toEqual({
    name: "aerovato",
    version: "0.4.0",
    hooks: "./hooks/hooks.json",
  });
  expect(JSON.parse(await readFile(catalogPath, "utf8"))).toEqual({
    name: "operator-memory",
    plugins: [
      {
        name: "aerovato",
        source: { source: "npm", package: "@aerovato/operator-codex", version: "0.4.0" },
      },
    ],
  });
});
