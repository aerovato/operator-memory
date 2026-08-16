import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeChildProcessSpawner, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import { runCli } from "../src/cli.ts";
import { updateNotice } from "../src/commands/upgrade.ts";
import { GitRunner } from "../src/git.ts";
import { NpmRegistry } from "../src/npm-registry.ts";
import type { CliContext, CliResult } from "../src/utils.ts";

const originalPath = process.env.PATH;
let directory: string;
let context: CliContext;
let record: string;

beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), "operator-helper-install-"));
  const bin = join(directory, "bin");
  fs.mkdirSync(bin);
  record = join(directory, "record");
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
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
  "upgrades through Bun with the minimum release age disabled",
  async () => {
    executable(
      "bun",
      'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nprintf "%s" "$*" > "$OPERATOR_TEST_RECORD"',
    );
    executable("npm", "exit 1");

    const result = await execute(["upgrade"], "4.5.6");

    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(record, "utf8")).toBe(
      "add --global --minimum-release-age 0 @aerovato/operator-helper@latest",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "upgrades through npm with the minimum release age disabled",
  async () => {
    executable("bun", "exit 1");
    executable(
      "npm",
      'if [ "$1" = "list" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nprintf "%s\\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"',
    );

    const result = await execute(["upgrade"], "4.5.6");

    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(record, "utf8")).toBe(
      "install --global @aerovato/operator-helper@latest\n0",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "prints manual commands when the installation channel is unknown",
  async () => {
    executable("bun", "exit 1");
    executable("npm", "exit 1");

    const result = await execute(["upgrade"], "4.5.6");

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Could not determine how Operator Helper was installed");
    expect(result.output).toContain("--minimum-release-age 0");
    expect(result.output).toContain("NPM_CONFIG_MIN_RELEASE_AGE=0");
  },
);

test("prints a noninteractive update notice only for newer versions", async () => {
  const newer = await Effect.runPromise(
    updateNotice("1.2.3").pipe(Effect.provide(registry("1.3.0"))),
  );
  const current = await Effect.runPromise(
    updateNotice("1.3.0").pipe(Effect.provide(registry("1.3.0"))),
  );

  expect(newer).toBe("Operator Helper 1.3.0 is available. Run operator-helper upgrade.");
  expect(current).toBeNull();
});

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

function registry(version: string): Layer.Layer<NpmRegistry.Service> {
  return Layer.succeed(
    NpmRegistry.Service,
    NpmRegistry.Service.of({ latestVersion: () => Effect.succeed(version) }),
  );
}
