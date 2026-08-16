import { expect, test } from "vitest";

import { renderTable } from "../src/output.ts";

test("renders borderless plaintext tables", () => {
  expect(
    renderTable([
      ["Name", "Status"],
      ["Operator", "Ready"],
    ]),
  ).toBe("Name      Status\nOperator  Ready");
});
