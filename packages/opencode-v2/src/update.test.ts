import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, expect, test } from "vitest";

import { checkAutoUpdate, clearInstallCache, isVersionNewer, resolveUpdate } from "./update.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })),
  );
});

test("compares stable semantic versions", () => {
  expect(isVersionNewer("1.2.4", "1.2.3")).toBe(true);
  expect(isVersionNewer("2.0.0", "1.9.9")).toBe(true);
  expect(isVersionNewer("1.2.3", "1.2.3")).toBe(false);
  expect(isVersionNewer("latest", "1.2.3")).toBe(false);
});

test("resolves updates only from the latest V2 cache", async () => {
  const latest = await installation("operator-opencode-v2@latest", "1.2.3");
  const pinned = await installation("operator-opencode-v2@1.2.3", "1.2.3");

  await expect(resolveUpdate(latest.moduleUrl, async () => "1.3.0")).resolves.toEqual({
    current: latest.install,
    latest: "1.3.0",
  });
  await expect(resolveUpdate(pinned.moduleUrl, async () => "1.3.0")).resolves.toEqual({
    current: null,
    latest: null,
  });
});

test("installs a newer version", async () => {
  const current = await installation("operator-opencode-v2@latest", "1.2.3");
  const installs: string[] = [];

  const result = await checkAutoUpdate(
    { current: current.install, latest: "1.3.0" },
    async (_install, version) => {
      installs.push(version);
      return "updated";
    },
  );

  expect(installs).toEqual(["1.3.0"]);
  expect(result).toEqual({ status: "updated", current: "1.2.3", latest: "1.3.0" });
});

test("clears the complete V2 package cache", async () => {
  const current = await installation("operator-opencode-v2@latest", "1.2.3");

  await expect(clearInstallCache(current.cacheDirectory)).resolves.toBe("cache-cleared");
  await expect(access(current.cacheDirectory)).rejects.toThrow();
});

async function installation(wrapper: string, version: string) {
  const root = await mkdtemp(join(tmpdir(), "operator-v2-update-"));
  temporaryDirectories.push(root);
  const cacheDirectory = join(root, "npm", wrapper);
  const installDirectory = join(cacheDirectory, "123456789");
  const packageDirectory = join(
    installDirectory,
    "node_modules",
    "@aerovato",
    "operator-opencode-v2",
  );
  const modulePath = join(packageDirectory, "dist", "index.js");
  await mkdir(join(packageDirectory, "dist"), { recursive: true });
  await writeFile(
    join(packageDirectory, "package.json"),
    JSON.stringify({ name: "@aerovato/operator-opencode-v2", version }),
  );
  await writeFile(modulePath, "");
  return {
    moduleUrl: pathToFileURL(modulePath).href,
    cacheDirectory,
    install: { directory: installDirectory, cacheDirectory, version },
  };
}
