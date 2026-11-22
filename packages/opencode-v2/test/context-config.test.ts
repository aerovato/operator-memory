import { expect, test } from "vitest";

import {
  DEFAULT_CONTEXT_MANAGEMENT_CONFIG,
  parseContextManagementConfig,
} from "../src/context-config.ts";

test("absent options yield the defaults, disabled", () => {
  const result = parseContextManagementConfig(undefined);
  expect(result).toEqual({ ok: true, value: DEFAULT_CONTEXT_MANAGEMENT_CONFIG });
  expect(result.ok && result.value.enabled).toBe(false);
});

test("parses a full block", () => {
  const result = parseContextManagementConfig({
    operator: {
      contextManagement: {
        enabled: true,
        ratio: 0.7,
        hardCapTokens: 200000,
        keepRecentTurns: 5,
        compactOnComplete: false,
        compactFloorTokens: 16000,
      },
    },
  });

  expect(result.ok && result.value).toEqual({
    enabled: true,
    ratio: 0.7,
    hardCapTokens: 200000,
    keepRecentTurns: 5,
    compactOnComplete: false,
    compactFloorTokens: 16000,
  });
});

test("partial blocks inherit defaults", () => {
  const result = parseContextManagementConfig({
    operator: { contextManagement: { enabled: true, ratio: 0.5 } },
  });

  expect(result.ok && result.value).toEqual({
    ...DEFAULT_CONTEXT_MANAGEMENT_CONFIG,
    enabled: true,
    ratio: 0.5,
  });
});

test("rejects wrong-typed values instead of falling back", () => {
  const ratio = parseContextManagementConfig({
    operator: { contextManagement: { enabled: true, ratio: "high" } },
  });
  expect(ratio.ok).toBe(false);

  const enabled = parseContextManagementConfig({
    operator: { contextManagement: { enabled: "yes" } },
  });
  expect(enabled.ok).toBe(false);
});

test("rejects non-object blocks", () => {
  const block = parseContextManagementConfig({ operator: { contextManagement: [1, 2] } });
  expect(block.ok).toBe(false);
});
