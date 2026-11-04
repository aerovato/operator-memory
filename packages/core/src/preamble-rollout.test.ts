import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { selectPreambleVersion } from "./preamble-rollout.ts";

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

test.each([
  ["000000000000000000000000000000ad", "2.0"], // Bucket 0
  ["00000000000000000000000000000010", "2.0"], // Bucket 19
  ["0000000000000000000000000000002d", "1.1"], // Bucket 20
  ["00000000000000000000000000000068", "1.1"], // Bucket 99
] as const)("keeps the frozen bucket assignment for %s", (machineId, version) => {
  vi.mocked(readFileSync).mockReturnValue(`${machineId}\n`);
  expect(selectPreambleVersion()).toBe(version);
  expect(selectPreambleVersion()).toBe(version);
  expect(readFileSync).toHaveBeenCalledWith("/etc/machine-id", "utf8");
  expect(execFileSync).not.toHaveBeenCalled();
});

test("the beta override bypasses machine identification", () => {
  vi.stubEnv("OPERATOR_PREAMBLE_BETA", "1");
  expect(selectPreambleVersion()).toBe("2.0");
  expect(platform).not.toHaveBeenCalled();
  expect(readFileSync).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
});

test.each(["", "0", "true", "01", " 1"])("does not treat %s as a beta override", value => {
  vi.stubEnv("OPERATOR_PREAMBLE_BETA", value);
  vi.mocked(readFileSync).mockReturnValue("0000000000000000000000000000002d");
  expect(selectPreambleVersion()).toBe("1.1");
  expect(readFileSync).toHaveBeenCalled();
});

test.each(["", "uninitialized", "not-a-machine-id", "0".repeat(32)])(
  "uses v1.1 for an invalid Linux identity: %s",
  value => {
    vi.mocked(readFileSync).mockReturnValue(value);
    expect(selectPreambleVersion()).toBe("1.1");
  },
);

test("normalizes Linux machine IDs", () => {
  vi.mocked(readFileSync).mockReturnValue("  000000000000000000000000000000AD\n");
  expect(selectPreambleVersion()).toBe("2.0");
});

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
    expect(selectPreambleVersion()).toBe("2.0");
    vi.mocked(execFileSync).mockReturnValue(
      operatingSystem === "darwin"
        ? `    "IOPlatformUUID" = "${uuid.toLowerCase()}"\n`
        : `    MachineGuid    REG_SZ    ${uuid.toLowerCase()}\r\n`,
    );
    expect(selectPreambleVersion()).toBe("2.0");
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
  "uses v1.1 for missing or invalid %s UUIDs",
  operatingSystem => {
    vi.mocked(platform).mockReturnValue(operatingSystem);
    for (const uuid of ["", "bad-value", "00000000-0000-0000-0000-000000000000"]) {
      vi.mocked(execFileSync).mockReturnValue(
        operatingSystem === "darwin"
          ? `"IOPlatformUUID" = "${uuid}"`
          : `MachineGuid    REG_SZ    ${uuid}`,
      );
      expect(selectPreambleVersion()).toBe("1.1");
    }
  },
);

test.each(["linux", "darwin", "win32"] as const)(
  "uses v1.1 when %s identity access fails",
  operatingSystem => {
    vi.mocked(platform).mockReturnValue(operatingSystem);
    const fail = (): never => {
      throw new Error("identity unavailable");
    };
    vi.mocked(readFileSync).mockImplementation(fail);
    vi.mocked(execFileSync).mockImplementation(fail);
    expect(selectPreambleVersion()).toBe("1.1");
  },
);

test("uses v1.1 on unsupported platforms without running commands", () => {
  vi.mocked(platform).mockReturnValue("freebsd");
  expect(selectPreambleVersion()).toBe("1.1");
  expect(readFileSync).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
});
