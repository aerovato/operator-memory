import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, expect, test } from "vitest";
import { parse } from "jsonc-parser";
import { registerLocalOpenCode } from "./install-opencode.ts";

let directory: string;
const pluginDirectory = "/workspace/packages/opencode-v2/dist";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "operator-opencode-install-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("creates global configuration with the development build after the published-ID disable", async () => {
  const configPath = await registerLocalOpenCode(join(directory, "config"), pluginDirectory);
  expect(parse(await readFile(configPath, "utf8"))).toEqual({
    $schema: "https://opencode.ai/config.json",
    plugins: ["-aerovato.operator-memory", pluginDirectory],
  });
});

test("preserves JSONC comments, settings, and published registrations and is idempotent", async () => {
  const configPath = join(directory, "opencode.jsonc");
  await writeFile(
    configPath,
    `{
  // Keep my settings.
  "model": "openai/model",
  "plugins": [
    // Keep the published registration.
    "@aerovato/operator-opencode-v2@latest",
    { "package": "other", "options": { "enabled": true } },
  ],
}`,
  );
  expect(await registerLocalOpenCode(directory, pluginDirectory)).toBe(configPath);
  const first = await readFile(configPath, "utf8");
  expect(first).toContain("// Keep my settings.");
  expect(first).toContain("// Keep the published registration.");
  expect(parse(first)).toEqual({
    model: "openai/model",
    plugins: [
      "@aerovato/operator-opencode-v2@latest",
      { package: "other", options: { enabled: true } },
      "-aerovato.operator-memory",
      pluginDirectory,
    ],
  });
  await registerLocalOpenCode(directory, pluginDirectory);
  expect(await readFile(configPath, "utf8")).toBe(first);
});

test.each(["{ broken", "[]", '{"plugins": {}}'])(
  "rejects invalid config without overwriting: %s",
  async text => {
    const configPath = join(directory, "opencode.json");
    await writeFile(configPath, text);
    await expect(registerLocalOpenCode(directory, pluginDirectory)).rejects.toThrow(TypeError);
    expect(await readFile(configPath, "utf8")).toBe(text);
  },
);
