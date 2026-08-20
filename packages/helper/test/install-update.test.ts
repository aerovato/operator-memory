import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeChildProcessSpawner, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import { runCli } from "../src/cli.ts";
import { GitRunner } from "../src/git.ts";
import { NpmRegistry } from "../src/npm-registry.ts";
import { autoUpdate } from "../src/update.ts";
import type { CliContext, CliResult } from "../src/utils.ts";

const originalPath = process.env.PATH;
const originalXdgCacheHome = process.env.XDG_CACHE_HOME;
let directory: string;
let context: CliContext;
let record: string;

beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), "operator-helper-install-"));
  const bin = join(directory, "bin");
  fs.mkdirSync(bin);
  record = join(directory, "record");
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  process.env.XDG_CACHE_HOME = join(directory, ".cache");
  process.env.OPERATOR_TEST_RECORD = record;
  context = {
    cwd: directory,
    home: directory,
    xdgConfigHome: null,
    version: "1.2.3",
  };
});

afterEach(() => {
  process.env.PATH = originalPath;
  if (originalXdgCacheHome === undefined) {
    delete process.env.XDG_CACHE_HOME;
  } else {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome;
  }
  delete process.env.OPERATOR_TEST_RECORD;
  fs.rmSync(directory, { recursive: true, force: true });
});

test.runIf(process.platform !== "win32")(
  "installs the latest OpenCode plugin globally",
  async () => {
    const cache = join(
      directory,
      ".cache",
      "opencode",
      "packages",
      "@aerovato",
      "operator-opencode@latest",
    );
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(join(cache, "stale"), "stale");
    executable(
      "opencode",
      'printf "%s\\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"\nprintf "installed"',
    );

    const result = await execute(["install", "opencode"], "4.5.6");

    expect(result).toEqual({ exitCode: 0, output: "installed" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "plugin @aerovato/operator-opencode@latest --global --force\n0",
    );
    expect(fs.existsSync(cache)).toBe(false);
  },
);

test.runIf(process.platform !== "win32")(
  "clears the OpenCode plugin cache from XDG_CACHE_HOME",
  async () => {
    const xdgCacheHome = join(directory, "custom-cache");
    const cache = join(
      xdgCacheHome,
      "opencode",
      "packages",
      "@aerovato",
      "operator-opencode@latest",
    );
    process.env.XDG_CACHE_HOME = xdgCacheHome;
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(join(cache, "stale"), "stale");
    executable("opencode", 'printf "installed"');

    const result = await execute(["install", "opencode"], "4.5.6");

    expect(result).toEqual({ exitCode: 0, output: "installed" });
    expect(fs.existsSync(cache)).toBe(false);
  },
);

test.runIf(process.platform !== "win32")(
  "automatically updates through Bun with the minimum release age disabled",
  async () => {
    executable(
      "bun",
      'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nprintf "%s" "$*" > "$OPERATOR_TEST_RECORD"',
    );
    executable("npm", "exit 1");

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "updated" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "add --global --minimum-release-age 0 @aerovato/operator-helper@4.5.6",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "automatically updates through npm with the minimum release age disabled",
  async () => {
    executable("bun", "exit 1");
    executable(
      "npm",
      'if [ "$1" = "list" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nprintf "%s\\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"',
    );

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "updated" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "install --global @aerovato/operator-helper@4.5.6\n0",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "reports an unknown installation channel when an update is available",
  async () => {
    executable("bun", "exit 1");
    executable("npm", "exit 1");

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "unknown", latest: "4.5.6" });
  },
);

test("does not inspect installation channels without a newer version", async () => {
  const result = await update("1.2.3");

  expect(result).toEqual({ status: "current" });
});

test("reuses a recent update check", async () => {
  let checks = 0;
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  const registryLayer = Layer.succeed(
    NpmRegistry.Service,
    NpmRegistry.Service.of({
      latestVersion: () => {
        checks += 1;
        return Effect.succeed("1.2.3");
      },
    }),
  );
  const run = () =>
    Effect.runPromise(
      autoUpdate(context.version, context).pipe(
        Effect.provide(Layer.mergeAll(child, registryLayer)),
      ),
    );

  await expect(run()).resolves.toEqual({ status: "current" });
  await expect(run()).resolves.toEqual({ status: "current" });
  expect(checks).toBe(1);
});

test.runIf(process.platform !== "win32")(
  "silently retains the current version when automatic installation fails",
  async () => {
    executable(
      "bun",
      'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nexit 1',
    );
    executable("npm", "exit 1");

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "failed" });
  },
);

function executable(name: string, body: string): void {
  const path = join(directory, "bin", name);
  fs.writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

function execute(arguments_: ReadonlyArray<string>, latest: string): Promise<CliResult> {
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  const git = Layer.succeed(
    GitRunner.Service,
    GitRunner.Service.of({ run: () => Effect.succeed("") }),
  );
  const layers = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, child, git, registry(latest));
  return Effect.runPromise(runCli(arguments_, context).pipe(Effect.provide(layers)));
}

function update(latest: string) {
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  return Effect.runPromise(
    autoUpdate(context.version, context).pipe(
      Effect.provide(Layer.mergeAll(child, registry(latest))),
    ),
  );
}

function registry(version: string): Layer.Layer<NpmRegistry.Service> {
  return Layer.succeed(
    NpmRegistry.Service,
    NpmRegistry.Service.of({ latestVersion: () => Effect.succeed(version) }),
  );
}
