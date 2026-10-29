import { expect, test } from "vitest";

import { buildCompactionPrompt } from "./compaction.ts";

test("compaction prompt references Brain paths without inlining content", () => {
  const prompt = buildCompactionPrompt({
    brainPaths: ["~/.operator/user", ".operator", ".operator-shared"],
  });

  expect(prompt).toContain("~/.operator/user");
  expect(prompt).toContain(".operator-shared");
  expect(prompt).toContain("operator:read_omitted");
  expect(prompt).toContain("Compaction is lossy; the Brain is not.");
});

test("compaction prompt preserves omission notices verbatim", () => {
  const prompt = buildCompactionPrompt({ brainPaths: [".operator"] });
  expect(prompt).toContain("Keep every omission notice verbatim");
});
