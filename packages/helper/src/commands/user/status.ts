import { Effect, Path } from "effect";

import { inspectPath, listFiles, PathKindError, readOptionalText } from "../../filesystem.ts";
import { renderTable } from "../../output.ts";
import type { CliContext } from "../../utils.ts";
import { USER_ROOT } from "./common.ts";

const INIT_HINT = [
  "For Users: Run `/operator:user-init` in your harness to initialize.",
  "For Agents: Run `operator-helper user init`, then `operator-helper user guide`, and follow the guide.",
];

export const userStatus = Effect.fn("userStatus")(function* (context: CliContext) {
  const pathService = yield* Path.Path;
  const root = pathService.join(context.home, ".operator", "user");
  const kind = yield* inspectPath(root);

  if (kind === "missing") {
    return {
      exitCode: 0,
      output: [
        `User Partition: ${USER_ROOT}`,
        "",
        "⚠ User Partition Missing",
        renderTable([["Expected Location", `${USER_ROOT}/`]]),
        "",
        ...INIT_HINT,
      ].join("\n"),
    };
  }
  if (kind !== "directory") {
    return yield* new PathKindError({
      path: root,
      expected: "directory",
      actual: kind,
    });
  }

  const rows: string[][] = [];
  let missingCore = false;
  for (const [file, label] of [
    ["operator.md", "User Instructions"],
    ["catalog.md", "User Catalog"],
  ] as const) {
    const content = yield* readOptionalText(pathService.join(root, file));
    if (content === null) {
      missingCore = true;
    }
    rows.push([
      label,
      content === null
        ? `Missing (${USER_ROOT}/${file})`
        : `${USER_ROOT}/${file} (${Buffer.byteLength(content)} bytes)`,
    ]);
  }

  const files = yield* listFiles(root);
  const freeform = files.filter(
    file => file.relativePath !== "operator.md" && file.relativePath !== "catalog.md",
  );
  rows.push(["Freeform Content", `${freeform.length} files`]);

  const lines = [`User Partition: ${USER_ROOT}`, "", "✓ User Partition Found", renderTable(rows)];
  if (missingCore) {
    lines.push("", ...INIT_HINT);
  }

  return { exitCode: 0, output: lines.join("\n") };
});
