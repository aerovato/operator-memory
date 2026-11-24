import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  isRolloutAssigned,
  readMachineIdentity,
  selectPreambleVersion,
} from "./preamble-rollout.ts";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
vi.mock("node:os", () => ({ platform: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OPERATOR_PREAMBLE_BETA", undefined);
  vi.mocked(platform).mockReturnValue("linux");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("the beta override bypasses machine identification", () => {
  vi.stubEnv("OPERATOR_PREAMBLE_BETA", "1");
  expect(selectPreambleVersion()).toBe("2.1");
  expect(platform).not.toHaveBeenCalled();
  expect(readFileSync).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
});

test.each(["", "0", "true", "01", " 1"])("does not treat %s as a beta override", value => {
  vi.stubEnv("OPERATOR_PREAMBLE_BETA", value);
  vi.mocked(readFileSync).mockReturnValue("000000000000000000000000000000a7");
  expect(selectPreambleVersion()).toBe("2.0");
  expect(readFileSync).toHaveBeenCalled();
});

// Frozen v2.1 bucket boundaries: this identity hashes to bucket 19, the last assigned at 20 percent.
test("assigns v2.1 to the 20 percent rollout bucket", () => {
  vi.mocked(readFileSync).mockReturnValue("000000000000000000000000000000b9");
  expect(selectPreambleVersion()).toBe("2.1");
});

// This identity hashes to bucket 20, the first outside the rollout.
test("keeps v2.0 outside the rollout bucket", () => {
  vi.mocked(readFileSync).mockReturnValue("000000000000000000000000000000a7");
  expect(selectPreambleVersion()).toBe("2.0");
});

test("keeps v2.0 without a readable machine identity", () => {
  vi.mocked(readFileSync).mockReturnValue("");
  expect(selectPreambleVersion()).toBe("2.0");
});

test.each([
  ["0000000000000000000000000000002d", 29],
  ["00000000000000000000000000000068", 11],
  ["00000000000000000000000000000010", 43],
  ["000000000000000000000000000000ad", 95],
] as const)("keeps the frozen assignment for %s", (identity, bucket) => {
  expect(isRolloutAssigned(identity, bucket)).toBe(false);
  expect(isRolloutAssigned(identity, bucket + 1)).toBe(true);
  expect(isRolloutAssigned(identity, 100)).toBe(true);
});

test("assigns nobody at 0 percent", () => {
  expect(isRolloutAssigned("000000000000000000000000000000ad", 0)).toBe(false);
});

test("normalizes Linux machine identities", () => {
  vi.mocked(readFileSync).mockReturnValue("  000000000000000000000000000000AD\n");
  expect(readMachineIdentity()).toBe("000000000000000000000000000000ad");
});

test.each(["", "uninitialized", "not-a-machine-id", "0".repeat(32)])(
  "returns null for an invalid Linux identity: %s",
  value => {
    vi.mocked(readFileSync).mockReturnValue(value);
    expect(readMachineIdentity()).toBeNull();
  },
);

test.each(["darwin", "win32"] as const)(
  "reads and normalizes the %s machine UUID",
  operatingSystem => {
    vi.mocked(platform).mockReturnValue(operatingSystem);
    const uuid = "ABCDEF01-2345-6789-ABCD-000000000003";
    vi.mocked(execFileSync).mockReturnValue(
      operatingSystem === "darwin"
        ? `    "IOPlatformUUID" = "${uuid}"\n`
        : `\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    ${uuid}\r\n`,
    );
    expect(readMachineIdentity()).toBe(uuid.toLowerCase());
    expect(readFileSync).not.toHaveBeenCalled();
    expect(execFileSync).toHaveBeenCalledWith(
      operatingSystem === "darwin" ? "/usr/sbin/ioreg" : "reg.exe",
      operatingSystem === "darwin"
        ? ["-rd1", "-c", "IOPlatformExpertDevice"]
        : ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid", "/reg:64"],
      { encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] },
    );
  },
);

test.each(["darwin", "win32"] as const)(
  "returns null for missing or invalid %s UUIDs",
  operatingSystem => {
    vi.mocked(platform).mockReturnValue(operatingSystem);
    for (const uuid of ["", "bad-value", "00000000-0000-0000-0000-000000000000"]) {
      vi.mocked(execFileSync).mockReturnValue(
        operatingSystem === "darwin"
          ? `"IOPlatformUUID" = "${uuid}"`
          : `MachineGuid    REG_SZ    ${uuid}`,
      );
      expect(readMachineIdentity()).toBeNull();
    }
  },
);

test.each(["linux", "darwin", "win32"] as const)(
  "returns null when %s identity access fails",
  operatingSystem => {
    vi.mocked(platform).mockReturnValue(operatingSystem);
    const fail = (): never => {
      throw new Error("identity unavailable");
    };
    vi.mocked(readFileSync).mockImplementation(fail);
    vi.mocked(execFileSync).mockImplementation(fail);
    expect(readMachineIdentity()).toBeNull();
  },
);

test("returns null on unsupported platforms without running commands", () => {
  vi.mocked(platform).mockReturnValue("freebsd");
  expect(readMachineIdentity()).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
});
