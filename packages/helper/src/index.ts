#!/usr/bin/env node

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
import { updateNotice } from "./commands/upgrade.ts";
import { GitRunner } from "./git.ts";
import { NpmRegistry } from "./npm-registry.ts";

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
  };
  const notice = yield* updateNotice(packageJson.version);
  if (notice !== null) {
    yield* Console.warn(notice);
  }
  const result = yield* runCli(environment.arguments, {
    cwd: environment.cwd,
    home: environment.home,
    xdgConfigHome: environment.xdgConfigHome,
    version: packageJson.version,
  });
  yield* Console.log(result.output);
  process.exitCode = result.exitCode;
}).pipe(Effect.provide(LiveLayers));

NodeRuntime.runMain(main);
