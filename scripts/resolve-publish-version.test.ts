import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve("scripts/resolve-publish-version.sh");

const resolveVersion = (currentVersion: string, requestedVersion: string) =>
  spawnSync("sh", [script, currentVersion, requestedVersion], {
    encoding: "utf8",
  });

describe("resolve publish version", () => {
  it.each([
    ["major", "2.0.0"],
    ["minor", "1.3.0"],
    ["patch", "1.2.4"],
  ])("resolves a %s bump", (requestedVersion, expectedVersion) => {
    const result = resolveVersion("1.2.3", requestedVersion);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${expectedVersion}\n`);
    expect(result.stderr).toBe("");
  });

  it.each([
    ["4.5.6", "4.5.6"],
    ["v4.5.6", "4.5.6"],
  ])("preserves the explicit version %s", (requestedVersion, expectedVersion) => {
    const result = resolveVersion("1.2.3", requestedVersion);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${expectedVersion}\n`);
    expect(result.stderr).toBe("");
  });

  it.each(["", "latest", "1.2", "1.2.3.4", "1.two.3"])(
    "rejects the requested version %j",
    requestedVersion => {
      const result = resolveVersion("1.2.3", requestedVersion);

      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("Version must be major, minor, patch, or X.Y.Z.\n");
    },
  );

  it("rejects an invalid current package version", () => {
    const result = resolveVersion("1.2", "patch");

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Current package version must be in X.Y.Z format.\n");
  });
});
