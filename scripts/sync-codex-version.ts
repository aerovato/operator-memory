import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export async function syncCodexVersion(root: string): Promise<void> {
  const packagePath = join(root, "packages/codex/package.json");
  const pluginPath = join(root, "packages/codex/.codex-plugin/plugin.json");
  const marketplacePath = join(root, ".agents/plugins/marketplace.json");
  const packageManifest: { version: string } = JSON.parse(await readFile(packagePath, "utf8"));
  const plugin: Record<string, unknown> = JSON.parse(await readFile(pluginPath, "utf8"));
  const marketplace: { plugins: { name: string; source: { version: string } }[] } = JSON.parse(
    await readFile(marketplacePath, "utf8"),
  );
  const entry = marketplace.plugins.find(plugin => plugin.name === "aerovato");
  if (entry === undefined) throw new Error("Codex marketplace is missing the aerovato plugin");

  plugin.version = packageManifest.version;
  entry.source.version = packageManifest.version;
  await writeFile(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
  await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
}

if (import.meta.main) {
  await syncCodexVersion(resolve(import.meta.dirname, ".."));
}
