#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

import {
  NodeChildProcessSpawner,
  NodeFileSystem,
  NodePath,
  NodeRuntime,
} from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";

import packageJson from "../package.json" with { type: "json" };
import { runCli } from "./cli.ts";
import { GitRunner } from "./git.ts";
import { NpmRegistry } from "./npm-registry.ts";
import { autoUpdate } from "./update.ts";

const SKIP_UPDATE_ENVIRONMENT_VARIABLE = "OPERATOR_HELPER_SKIP_UPDATE";

const ChildProcessLayer = NodeChildProcessSpawner.layer.pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(NodePath.layer),
);

const LiveLayers = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  ChildProcessLayer,
  NpmRegistry.layer,
  GitRunner.layer.pipe(
    Layer.provide(ChildProcessLayer),
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  ),
);

const main = Effect.gen(function* () {
  const environment = {
    arguments: process.argv.slice(2),
    cwd: process.cwd(),
    home: homedir(),
    xdgConfigHome: process.env.XDG_CONFIG_HOME ?? null,
    version: packageJson.version,
  };
  if (process.env[SKIP_UPDATE_ENVIRONMENT_VARIABLE] !== "1") {
    const update = yield* autoUpdate(packageJson.version, environment);
    if (update.status === "updated") {
      const entrypoint = process.argv[1];
      if (entrypoint !== undefined) {
        const rerun = spawnSync(process.execPath, [entrypoint, ...environment.arguments], {
          cwd: environment.cwd,
          env: { ...process.env, [SKIP_UPDATE_ENVIRONMENT_VARIABLE]: "1" },
          stdio: "inherit",
        });
        if (rerun.error === undefined && rerun.status !== null) {
          process.exitCode = rerun.status;
          return;
        }
      }
    } else if (update.status === "unknown") {
      yield* Console.warn(
        `Operator Helper ${update.latest} is available, but automatic update could not determine whether Bun or npm owns this installation. Ask the user to update operator-helper manually using the original installation method.`,
      );
    }
  }
  const result = yield* runCli(environment.arguments, {
    cwd: environment.cwd,
    home: environment.home,
    xdgConfigHome: environment.xdgConfigHome,
    version: environment.version,
  });
  yield* Console.log(result.output);
  process.exitCode = result.exitCode;
}).pipe(Effect.provide(LiveLayers));

NodeRuntime.runMain(main);
