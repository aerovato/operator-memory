import { Effect, Path, Result } from "effect";

import {
  ensureDirectory,
  inspectPath,
  PathKindError,
  writeTextIfMissing,
} from "../../filesystem.ts";
import { ensureGlobalIgnore } from "../../git.ts";
import { renderTable } from "../../output.ts";
import { readTemplate, TemplatePath } from "../../templates.ts";
import type { CliContext } from "../../utils.ts";
import { fileErrorMessage } from "../common.ts";
import { CORE_FILES, PRIVATE_ROOT, SHARED_ROOT } from "./common.ts";

export const projectInit = Effect.fn("projectInit")(function* (context: CliContext) {
  const pathService = yield* Path.Path;
  const ignored = yield* ensureGlobalIgnore(context.home, context.xdgConfigHome);

  const privateRoot = pathService.join(context.cwd, PRIVATE_ROOT);
  const sharedRoot = pathService.join(context.cwd, SHARED_ROOT);
  yield* ensureDirectory(privateRoot);

  const templates = {
    "operator.md": readTemplate(TemplatePath.ProjectOperator),
    "index/index.md": readTemplate(TemplatePath.ProjectIndex),
    "catalog.md": readTemplate(TemplatePath.ProjectCatalog),
  } satisfies Record<(typeof CORE_FILES)[number], string>;

  const lines = ["✓ Project Private Initialized"];
  const privateRows: string[][] = [];
  let failed = false;
  for (const file of CORE_FILES) {
    const written = yield* writeTextIfMissing(
      pathService.join(privateRoot, file),
      templates[file],
    ).pipe(Effect.result);
    if (Result.isFailure(written)) {
      failed = true;
      privateRows.push(["Failed", `${PRIVATE_ROOT}/${file}: ${fileErrorMessage(written.failure)}`]);
    } else {
      privateRows.push([
        written.success === "created" ? "Created" : "Preserved",
        `${PRIVATE_ROOT}/${file}`,
      ]);
    }
  }
  lines.push(renderTable(privateRows));

  const sharedKind = yield* inspectPath(sharedRoot);
  if (sharedKind === "missing") {
    lines.push("", "⚠ Project Shared Not Initialized");
  } else if (sharedKind !== "directory") {
    failed = true;
    lines.push(
      "",
      "✗ Project Shared Failed",
      fileErrorMessage(
        new PathKindError({ path: sharedRoot, expected: "directory", actual: sharedKind }),
      ),
    );
  } else {
    lines.push("", "✓ Project Shared Found");
    const sharedRows: string[][] = [];
    const readmeResult = yield* writeTextIfMissing(
      pathService.join(sharedRoot, "README.md"),
      readTemplate(TemplatePath.ProjectSharedReadme),
    ).pipe(Effect.result);
    if (Result.isFailure(readmeResult)) {
      failed = true;
      sharedRows.push([
        "Failed",
        `${SHARED_ROOT}/README.md: ${fileErrorMessage(readmeResult.failure)}`,
      ]);
    } else {
      sharedRows.push([
        readmeResult.success === "created" ? "Created" : "Preserved",
        `${SHARED_ROOT}/README.md`,
      ]);
    }

    for (const file of CORE_FILES) {
      const path = pathService.join(sharedRoot, file);
      const kind = yield* inspectPath(path);
      if (kind === "file" || kind === "missing") {
        sharedRows.push([kind === "file" ? "Present" : "Missing", `${SHARED_ROOT}/${file}`]);
      } else {
        failed = true;
        sharedRows.push([
          "Failed",
          `${SHARED_ROOT}/${file}: ${fileErrorMessage(new PathKindError({ path, expected: "file", actual: kind }))}`,
        ]);
      }
    }
    lines.push(renderTable(sharedRows));
  }
  lines.push(
    "",
    `✓ Global Git Ignore ${ignored === "configured" ? "Configured" : "Already Configured"}`,
  );

  return { exitCode: failed ? 1 : 0, output: lines.join("\n") };
});
