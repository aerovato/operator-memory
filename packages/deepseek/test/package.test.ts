import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { apply, name } from "../src/index.ts";

const packageDirectory = resolve(import.meta.dirname, "..");

describe("DeepSeek adapter package", () => {
  test("exports a function Host plugin", () => {
    expect(name).toBe("operator-memory");
    expect(apply).toBeTypeOf("function");
  });

  test("mounts the Host plugin through its bundle patch", async () => {
    const patch = await readFile(resolve(packageDirectory, "cordis.patch.yml"), "utf8");

    expect(patch).toContain("id: operator-memory");
    expect(patch).toContain("name: '@aerovato/operator-deepseek'");
  });
});
