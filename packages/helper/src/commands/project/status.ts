import { Effect, Path, Result } from "effect";

import { inspectPath, listFiles, PathKindError, readOptionalText } from "../../filesystem.ts";
import { checkGlobalIgnore, hasTrackedPrivateFiles } from "../../git.ts";
import { renderTable } from "../../output.ts";
import type { CliContext } from "../../utils.ts";
import { CORE_FILES, PRIVATE_ROOT, SHARED_ROOT } from "./common.ts";

export const projectStatus = Effect.fn("projectStatus")(function* (context: CliContext) {
  const privateStatus = yield* inspectPartition(context.cwd, PRIVATE_ROOT, false);
  const sharedStatus = yield* inspectPartition(context.cwd, SHARED_ROOT, true);
  const ignored = yield* checkGlobalIgnore(context.home, context.xdgConfigHome);
  const tracked = yield* hasTrackedPrivateFiles(context.cwd).pipe(Effect.result);
  const lines = [
    `Project: ${context.cwd}`,
    "",
    ...privateStatus.lines,
    "",
    ...sharedStatus.lines,
    "",
    `${ignored ? "✓" : "✗"} Global Git Ignore ${ignored ? "Contains" : "Missing"} .operator/`,
  ];

  const privateFilesAreTracked = Result.isSuccess(tracked) && tracked.success;
  if (Result.isSuccess(tracked)) {
    if (!tracked.success) {
      lines.push("✓ Project Private Is Not Tracked");
    } else {
      lines.push("✗ Project Private Has Tracked Files");
    }
  } else {
    lines.push("✗ Unable To Inspect Tracked Private Files", `    ${tracked.failure.message}`);
  }

  if (!privateStatus.exists && !sharedStatus.exists) {
    lines.push(
      "",
      "✗ Project Brain Missing",
      "",
      "For Users: Run `/operator:project-init` in your harness to initialize.",
      "For Agents: Run `operator-helper project init`, then `operator-helper project guide`, and follow the guide.",
    );
  }

  return {
    exitCode: !ignored || Result.isFailure(tracked) || privateFilesAreTracked ? 1 : 0,
    output: lines.join("\n"),
  };
});

type PartitionStatus = {
  readonly exists: boolean;
  readonly lines: string[];
};

const inspectPartition = Effect.fn("inspectPartition")(function* (
  cwd: string,
  root: string,
  shared: boolean,
) {
  const pathService = yield* Path.Path;
  const absoluteRoot = pathService.join(cwd, root);
  const kind = yield* inspectPath(absoluteRoot);
  const label = shared ? "Project Shared" : "Project Private";
  if (kind === "missing") {
    return {
      exists: false,
      lines: [`⚠ ${label} Missing`, renderTable([["Expected Location", `${root}/`]])],
    } satisfies PartitionStatus;
  }
  if (kind !== "directory") {
    return yield* new PathKindError({
      path: absoluteRoot,
      expected: "directory",
      actual: kind,
    });
  }

  const lines = [`✓ ${label} Found`];
  const rows: string[][] = [];
  for (const [file, name] of [
    ["operator.md", "Operator Instructions"],
    ["index/index.md", "Project Index"],
    ["catalog.md", "Partition Catalog"],
  ] as const) {
    rows.push(yield* describeFile(cwd, root, file, name));
  }

  const files = yield* listFiles(absoluteRoot);
  const excluded = new Set<string>(CORE_FILES);
  const freeform = files.filter(
    file => !excluded.has(file.relativePath) && !file.relativePath.startsWith("index/"),
  );
  rows.push(["Freeform Content", `${freeform.length} files`]);
  lines.push(renderTable(rows));
  return { exists: true, lines } satisfies PartitionStatus;
});

const describeFile = Effect.fn("describeFile")(function* (
  cwd: string,
  root: string,
  file: string,
  label: string,
) {
  const pathService = yield* Path.Path;
  const content = yield* readOptionalText(pathService.join(cwd, root, file));
  return [
    label,
    content === null
      ? `Missing (${root}/${file})`
      : `${root}/${file} (${Buffer.byteLength(content)} bytes)`,
  ] as [string, string];
});
