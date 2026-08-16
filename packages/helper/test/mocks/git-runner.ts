import { Layer } from "effect";

import { GitRunner } from "../../src/git.ts";

export function makeGitRunnerLayer(
  run: GitRunner.Interface["run"],
): Layer.Layer<GitRunner.Service> {
  return Layer.succeed(GitRunner.Service, GitRunner.Service.of({ run }));
}
