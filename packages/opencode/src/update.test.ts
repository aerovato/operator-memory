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
  expect(isVersionNewer("1.3.0", "1.2.9")).toBe(true);
  expect(isVersionNewer("2.0.0", "1.9.9")).toBe(true);
  expect(isVersionNewer("1.2.3", "1.2.3")).toBe(false);
  expect(isVersionNewer("1.2.2", "1.2.3")).toBe(false);
  expect(isVersionNewer("latest", "1.2.3")).toBe(false);
});

test("resolves update information only for the latest OpenCode wrapper", async () => {
  const latest = await installation("operator-opencode@latest", "1.2.3");
  const pinned = await installation("operator-opencode@1.2.3", "1.2.3");
  let fetches = 0;
  const latestVersion = async () => {
    fetches += 1;
    return "1.3.0";
  };

  await expect(resolveUpdate(latest.moduleUrl, latestVersion)).resolves.toEqual({
    current: { directory: latest.installDirectory, version: "1.2.3" },
    latest: "1.3.0",
  });
  await expect(resolveUpdate(pinned.moduleUrl, latestVersion)).resolves.toEqual({
    current: null,
    latest: null,
  });
  expect(fetches).toBe(1);
});

test("installs a newer version in the latest wrapper", async () => {
  const current = await installation("operator-opencode@latest", "1.2.3");
  const installs: Array<{ directory: string; version: string }> = [];

  const result = await checkAutoUpdate(
    { current: current.install, latest: "1.3.0" },
    async (install, version) => {
      installs.push({ directory: install.directory, version });
      return "updated";
    },
  );

  expect(installs).toEqual([{ directory: current.installDirectory, version: "1.3.0" }]);
  expect(result).toEqual({ status: "updated", current: "1.2.3", latest: "1.3.0" });
});

test("does not install when the cached version is current", async () => {
  const current = await installation("operator-opencode@latest", "1.2.3");
  let installed = false;

  const result = await checkAutoUpdate({ current: current.install, latest: "1.2.3" }, async () => {
    installed = true;
    return "updated";
  });

  expect(installed).toBe(false);
  expect(result).toEqual({ status: "none" });
});

test("clears the install cache after npm fails", async () => {
  const current = await installation("operator-opencode@latest", "1.2.3");

  await expect(clearInstallCache(current.installDirectory)).resolves.toBe("cache-cleared");
  await expect(access(current.installDirectory)).rejects.toThrow();
});

async function installation(
  wrapper: string,
  version: string,
): Promise<{
  moduleUrl: string;
  installDirectory: string;
  install: {
    directory: string;
    version: string;
  };
}> {
  const root = await mkdtemp(join(tmpdir(), "operator-update-"));
  temporaryDirectories.push(root);
  const installDirectory = join(root, "packages", "@aerovato", wrapper);
  const packageDirectory = join(installDirectory, "node_modules", "@aerovato", "operator-opencode");
  const modulePath = join(packageDirectory, "dist", "index.js");
  await mkdir(join(packageDirectory, "dist"), { recursive: true });
  await writeFile(
    join(packageDirectory, "package.json"),
    JSON.stringify({ name: "@aerovato/operator-opencode", version }),
  );
  await writeFile(modulePath, "");
  return {
    moduleUrl: pathToFileURL(modulePath).href,
    installDirectory,
    install: { directory: installDirectory, version },
  };
}
