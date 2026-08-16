import { Effect, Path } from "effect";

import { inspectPath, PathKindError } from "../../filesystem.ts";
import { renderTable } from "../../output.ts";
import type { CliContext } from "../../utils.ts";

const PARTITION_ROOTS = [".operator-shared", ".operator"] as const;

export const indexStatus = Effect.fn("indexStatus")(function* (context: CliContext) {
  const pathService = yield* Path.Path;
  const rootKinds = yield* Effect.all(
    PARTITION_ROOTS.map(root => inspectPath(pathService.join(context.cwd, root))),
    { concurrency: "unbounded" },
  );
  const projectExists = rootKinds.some(kind => kind === "directory");
  if (!projectExists) {
    return {
      exitCode: 0,
      output: `Project: ${context.cwd}

✗ Project Brain Missing
${renderTable([["Expected", ".operator/ and/or .operator-shared/"]])}

For Users: Run \`/operator:project-init\` in your harness to initialize.
For Agents: Run \`operator-helper project init\`, then \`operator-helper project guide\`, and follow the guide.`,
    };
  }

  const rows: string[][] = [];
  for (const root of PARTITION_ROOTS) {
    rows.push(yield* inspectMainIndex(context.cwd, root));
  }
  return {
    exitCode: 0,
    output: `Project: ${context.cwd}\n\n${renderTable(rows)}`,
  };
});

const inspectMainIndex = Effect.fn("inspectMainIndex")(function* (
  cwd: string,
  partitionRoot: string,
) {
  const pathService = yield* Path.Path;
  const relativePath = `${partitionRoot}/index/index.md`;
  const path = pathService.join(cwd, relativePath);
  const kind = yield* inspectPath(path);
  if (kind !== "missing" && kind !== "file") {
    return yield* new PathKindError({ path, expected: "file", actual: kind });
  }
  return [relativePath, kind === "file" ? "Found" : "Missing"] as [string, string];
});
