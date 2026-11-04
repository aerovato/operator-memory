import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { platform } from "node:os";

export type PreambleVersion = "1.1" | "2.0";

// Keep this namespace and bucketing stable across package and prompt versions.
const ROLLOUT_NAMESPACE = "operator-preamble-rollout-v1:";

export function selectPreambleVersion(): PreambleVersion {
  if (process.env.OPERATOR_PREAMBLE_BETA === "1") {
    return "2.0";
  }

  const machineId = readMachineId();
  if (machineId === null) {
    return "1.1";
  }

  const bucket =
    createHash("sha256").update(`${ROLLOUT_NAMESPACE}${machineId}`).digest().readUInt32BE(0) % 100;
  return bucket < 20 ? "2.0" : "1.1";
}

function readMachineId(): string | null {
  try {
    switch (platform()) {
      case "linux": {
        const value = readFileSync("/etc/machine-id", "utf8").trim().toLowerCase();
        return /^[a-f0-9]{32}$/.test(value) && !/^0+$/.test(value) ? value : null;
      }
      case "darwin": {
        const output = execFileSync("/usr/sbin/ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], {
          encoding: "utf8",
          timeout: 2000,
          stdio: ["ignore", "pipe", "ignore"],
        });
        return normalizeUuid(output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1]);
      }
      case "win32": {
        const output = execFileSync(
          "reg.exe",
          ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid", "/reg:64"],
          {
            encoding: "utf8",
            timeout: 2000,
            stdio: ["ignore", "pipe", "ignore"],
          },
        );
        return normalizeUuid(output.match(/MachineGuid\s+REG_SZ\s+(\S+)/i)?.[1]);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function normalizeUuid(value: string | undefined): string | null {
  const normalized = value?.toLowerCase();
  return normalized !== undefined
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(normalized)
    && normalized !== "00000000-0000-0000-0000-000000000000"
    ? normalized
    : null;
}
