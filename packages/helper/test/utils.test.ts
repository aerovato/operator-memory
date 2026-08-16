import { expect, test } from "vitest";

import { compareStrings, getErrorMessage, isRecord } from "../src/utils.ts";

test("normalizes error messages", () => {
  expect(getErrorMessage(new Error("failed"))).toBe("failed");
  expect(getErrorMessage(42)).toBe("42");
});

test("compares strings", () => {
  expect(compareStrings("a", "b")).toBe(-1);
  expect(compareStrings("b", "a")).toBe(1);
  expect(compareStrings("a", "a")).toBe(0);
});

test("identifies records", () => {
  expect(isRecord({ key: "value" })).toBe(true);
  expect(isRecord([])).toBe(false);
  expect(isRecord(null)).toBe(false);
  expect(isRecord("value")).toBe(false);
});
