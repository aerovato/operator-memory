import { expect, test } from "vitest";

import { inputOmissionNotice, outputOmissionNotice } from "./notices.ts";

// Expected strings replicate Magic Compact's templates verbatim
// (magic-compact 679a2437, packages/opencode-plugin/src/compact/constants.ts).

test("builds the output omission notice with the exact template", () => {
  expect(outputOmissionNotice("Result of read on /tmp/report.txt", 4821, "omitted-003")).toBe(
    `<tool-output-omission-notice>
Result of read on /tmp/report.txt

Output Length: 4821 characters
Content ID: omitted-003
</tool-output-omission-notice>`,
  );
});

test("builds the input omission notice with the exact template", () => {
  expect(
    inputOmissionNotice("Command passed to bash (truncated to head excerpt)", 2048, "omitted-007"),
  ).toBe(
    `<tool-input-omission-notice>
Command passed to bash (truncated to head excerpt)

Omitted Length: 2048 characters
Content ID: omitted-007
</tool-input-omission-notice>`,
  );
});

test("renders identical bytes for the same arguments", () => {
  const first = outputOmissionNotice("description", 10, "omitted-001");
  const second = outputOmissionNotice("description", 10, "omitted-001");
  expect(first).toBe(second);
});
