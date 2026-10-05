import { failure, type Result, success } from "./utils.ts";
import type { TriggerConfig } from "@aerovato/operator-core/context/triggers";

// Parses the operator.contextManagement block from ctx.options. Absent means
// the defaults (disabled); a present block with a wrong-typed value is a
// parse failure, not a silent fallback, so misconfiguration surfaces instead
// of quietly running with unintended thresholds.

export type ContextManagementConfig = {
  readonly enabled: boolean;
  readonly ratio: number;
  readonly hardCapTokens: number;
  readonly keepRecentTurns: number;
  readonly compactOnComplete: boolean;
  readonly compactFloorTokens: number;
};

export const DEFAULT_CONTEXT_MANAGEMENT_CONFIG: ContextManagementConfig = {
  enabled: false,
  ratio: 0.8,
  hardCapTokens: 250000,
  keepRecentTurns: 3,
  compactOnComplete: true,
  compactFloorTokens: 32000,
};

// Shared logic takes TriggerConfig; every adapter module converts through
// this single function.
export function toTriggerConfig(config: ContextManagementConfig): TriggerConfig {
  return {
    ratio: config.ratio,
    hardCapTokens: config.hardCapTokens,
    compactOnComplete: config.compactOnComplete,
    compactFloorTokens: config.compactFloorTokens,
  };
}

export type ConfigError = {
  readonly message: string;
};

export function parseContextManagementConfig(
  options: unknown,
): Result<ContextManagementConfig, ConfigError> {
  const block = readBlock(options);
  if (!block.ok) {
    return block;
  }
  if (block.value === null) {
    return success(DEFAULT_CONTEXT_MANAGEMENT_CONFIG);
  }

  const enabled = readBoolean(block.value, "enabled", DEFAULT_CONTEXT_MANAGEMENT_CONFIG.enabled);
  const ratio = readNumber(block.value, "ratio", DEFAULT_CONTEXT_MANAGEMENT_CONFIG.ratio);
  const hardCapTokens = readNumber(
    block.value,
    "hardCapTokens",
    DEFAULT_CONTEXT_MANAGEMENT_CONFIG.hardCapTokens,
  );
  const keepRecentTurns = readNumber(
    block.value,
    "keepRecentTurns",
    DEFAULT_CONTEXT_MANAGEMENT_CONFIG.keepRecentTurns,
  );
  const compactOnComplete = readBoolean(
    block.value,
    "compactOnComplete",
    DEFAULT_CONTEXT_MANAGEMENT_CONFIG.compactOnComplete,
  );
  const compactFloorTokens = readNumber(
    block.value,
    "compactFloorTokens",
    DEFAULT_CONTEXT_MANAGEMENT_CONFIG.compactFloorTokens,
  );

  if (!enabled.ok) return enabled;
  if (!ratio.ok) return ratio;
  if (!hardCapTokens.ok) return hardCapTokens;
  if (!keepRecentTurns.ok) return keepRecentTurns;
  if (!compactOnComplete.ok) return compactOnComplete;
  if (!compactFloorTokens.ok) return compactFloorTokens;

  return success({
    enabled: enabled.value,
    ratio: ratio.value,
    hardCapTokens: hardCapTokens.value,
    keepRecentTurns: keepRecentTurns.value,
    compactOnComplete: compactOnComplete.value,
    compactFloorTokens: compactFloorTokens.value,
  });
}

function readBlock(options: unknown): Result<Record<string, unknown> | null, ConfigError> {
  if (typeof options !== "object" || options === null) {
    return success(null);
  }
  const operator = "operator" in options ? options.operator : null;
  if (operator === null || operator === undefined) {
    return success(null);
  }
  if (typeof operator !== "object" || Array.isArray(operator)) {
    return failure({ message: 'The "operator" plugin option must be an object.' });
  }
  const contextManagement = "contextManagement" in operator ? operator.contextManagement : null;
  if (contextManagement === null || contextManagement === undefined) {
    return success(null);
  }
  if (typeof contextManagement !== "object" || Array.isArray(contextManagement)) {
    return failure({ message: 'The "operator.contextManagement" option must be an object.' });
  }
  return success(contextManagement as Record<string, unknown>);
}

function readNumber(
  block: Record<string, unknown>,
  key: string,
  defaultValue: number,
): Result<number, ConfigError> {
  const value = block[key];
  if (value === undefined) {
    return success(defaultValue);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return failure({ message: `The "operator.contextManagement.${key}" option must be a number.` });
  }
  return success(value);
}

function readBoolean(
  block: Record<string, unknown>,
  key: string,
  defaultValue: boolean,
): Result<boolean, ConfigError> {
  const value = block[key];
  if (value === undefined) {
    return success(defaultValue);
  }
  if (typeof value !== "boolean") {
    return failure({
      message: `The "operator.contextManagement.${key}" option must be a boolean.`,
    });
  }
  return success(value);
}
