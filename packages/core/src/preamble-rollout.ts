import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { platform } from "node:os";

// Infrastructure for A/B testing preambles. The v2.1 candidate is assigned to 20 percent of
// machines; everyone else, and any machine without a readable identity, receives v2.0.
// Enabling the beta preamble in the settings file opts a machine in regardless of the split.
export type PreambleVersion = "2.0" | "2.1";

const V21_ROLLOUT_PERCENTAGE = 20;

export function selectPreambleVersion(betaPreamble: boolean): PreambleVersion {
  if (betaPreamble) {
    return "2.1";
  }

  const identity = readMachineIdentity();
  return identity !== null && isRolloutAssigned(identity, V21_ROLLOUT_PERCENTAGE) ? "2.1" : "2.0";
}

// Returns whether `identity` belongs to the assigned `percentage` (0-100) of a stable hash
// split. The same identity and percentage always give the same result. Keep the hash input
// unchanged for the duration of an active rollout.
export function isRolloutAssigned(identity: string, percentage: number): boolean {
  return createHash("sha256").update(identity).digest().readUInt32BE(0) % 100 < percentage;
}

// Returns the OS machine identity in trimmed lowercase, or null when it is missing, invalid,
// unreadable, or unsupported. Never persist, transmit, or inject it into model context.
export function readMachineIdentity(): string | null {
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
