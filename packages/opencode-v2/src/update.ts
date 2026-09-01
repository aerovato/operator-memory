import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { OperatorToast } from "./notifications.ts";

const PACKAGE_NAME = "@aerovato/operator-opencode-v2";
const INSTALL_TIMEOUT = 60_000;

type PackageJson = {
  readonly name?: string;
  readonly version?: string;
};

type Install = {
  readonly directory: string;
  readonly cacheDirectory: string;
  readonly version: string;
};

type InstallResult = "updated" | "cache-cleared" | "cache-clear-failed";

type UpdateInformation = {
  readonly current: Install | null;
  readonly latest: string | null;
};

type UpdateResult =
  | { readonly status: "none" }
  | {
      readonly status: "updated" | "cache-cleared" | "cache-clear-failed";
      readonly current: string;
      readonly latest: string;
    };

let started = false;

export async function startAutoUpdate(
  showToast: (toast: OperatorToast) => Promise<void>,
): Promise<void> {
  if (started) return;
  started = true;

  const update = await resolveUpdate(import.meta.url, fetchLatestVersion);
  await showUpdateResult(showToast, await checkAutoUpdate(update, installPackage));
}

export async function checkAutoUpdate(
  update: UpdateInformation,
  install: (current: Install, latest: string) => Promise<InstallResult>,
): Promise<UpdateResult> {
  if (update.current === null) return { status: "none" };
  if (update.latest === null || !isVersionNewer(update.latest, update.current.version)) {
    return { status: "none" };
  }
  return {
    status: await install(update.current, update.latest),
    current: update.current.version,
    latest: update.latest,
  };
}

export async function resolveUpdate(
  moduleUrl: string,
  latestVersion: () => Promise<string | null>,
): Promise<UpdateInformation> {
  const packageDirectory = await findPackageDirectory(moduleUrl);
  if (packageDirectory === null) return { current: null, latest: null };

  const scopeDirectory = dirname(packageDirectory);
  const nodeModulesDirectory = dirname(scopeDirectory);
  const installDirectory = dirname(nodeModulesDirectory);
  const cacheDirectory = dirname(installDirectory);
  if (
    basename(packageDirectory) !== "operator-opencode-v2"
    || basename(scopeDirectory) !== "@aerovato"
    || basename(nodeModulesDirectory) !== "node_modules"
    || !/^\d+$/.test(basename(installDirectory))
    || basename(cacheDirectory) !== "operator-opencode-v2@latest"
  ) {
    return { current: null, latest: null };
  }

  const packageJson = await readPackageJson(join(packageDirectory, "package.json"));
  if (packageJson?.name !== PACKAGE_NAME || typeof packageJson.version !== "string") {
    return { current: null, latest: null };
  }
  return {
    current: {
      directory: installDirectory,
      cacheDirectory,
      version: packageJson.version,
    },
    latest: await latestVersion(),
  };
}

export function isVersionNewer(latest: string, current: string): boolean {
  const next = parseVersion(latest);
  const previous = parseVersion(current);
  if (next === null || previous === null) return false;

  for (const index of [0, 1, 2] as const) {
    if (next[index] !== previous[index]) return next[index] > previous[index];
  }
  return false;
}

async function findPackageDirectory(moduleUrl: string): Promise<string | null> {
  const modulePath = fileURLToPath(moduleUrl);
  for (let directory = dirname(modulePath); ; directory = dirname(directory)) {
    const packageJson = await readPackageJson(join(directory, "package.json"));
    if (packageJson?.name === PACKAGE_NAME) return directory;
    if (dirname(directory) === directory) return null;
  }
}

async function readPackageJson(path: string): Promise<PackageJson | null> {
  return readFile(path, "utf8")
    .then(value => JSON.parse(value) as PackageJson)
    .catch(() => null);
}

async function fetchLatestVersion(): Promise<string | null> {
  const registry = (process.env.NPM_CONFIG_REGISTRY ?? "https://registry.npmjs.org").replace(
    /\/+$/,
    "",
  );
  return fetch(`${registry}/${encodeURIComponent(PACKAGE_NAME)}/latest`, {
    signal: AbortSignal.timeout(10_000),
  })
    .then(async response => {
      if (!response.ok) return null;
      const value: unknown = await response.json();
      if (value === null || typeof value !== "object" || !("version" in value)) return null;
      return typeof value.version === "string" ? value.version : null;
    })
    .catch(() => null);
}

async function installPackage(current: Install, latest: string): Promise<InstallResult> {
  if ((await npmInstallPackage(current.directory, latest)) === "updated") return "updated";
  return clearInstallCache(current.cacheDirectory);
}

async function npmInstallPackage(
  installDirectory: string,
  version: string,
): Promise<"updated" | "failed"> {
  return new Promise(resolve => {
    const child = spawn(
      "npm",
      [
        "install",
        "--save-exact",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-progress",
        `${PACKAGE_NAME}@${version}`,
      ],
      {
        cwd: installDirectory,
        env: { ...process.env, NPM_CONFIG_MIN_RELEASE_AGE: "0" },
        stdio: "ignore",
      },
    );
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, INSTALL_TIMEOUT);
    child.once("error", () => {
      clearTimeout(timeout);
      resolve("failed");
    });
    child.once("exit", code => {
      clearTimeout(timeout);
      resolve(!timedOut && code === 0 ? "updated" : "failed");
    });
  });
}

export async function clearInstallCache(directory: string): Promise<InstallResult> {
  return rm(directory, { recursive: true, force: true })
    .then(() => "cache-cleared" as const)
    .catch(() => "cache-clear-failed" as const);
}

async function showUpdateResult(
  showToast: (toast: OperatorToast) => Promise<void>,
  result: UpdateResult,
): Promise<void> {
  if (result.status === "none") return;
  if (result.status === "updated") {
    await showToast({
      title: "Operator Updated",
      message: `v${result.current} → v${result.latest}. Restart OpenCode V2 to apply.`,
      variant: "success",
    }).catch(() => undefined);
    return;
  }
  if (result.status === "cache-cleared") {
    await showToast({
      title: "Operator Update Queued",
      message: "Restart OpenCode V2 to reinstall Operator.",
      variant: "info",
    }).catch(() => undefined);
    return;
  }
  await showToast({
    title: "Operator Update Failed",
    message: `Could not install v${result.latest}. Run operator-helper install opencode-v2 to install the latest version.`,
    variant: "error",
  }).catch(() => undefined);
}

function parseVersion(version: string): readonly [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (match === null) return null;
  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return [Number(major), Number(minor), Number(patch)];
}
