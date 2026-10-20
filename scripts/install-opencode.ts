import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { applyEdits, modify, parse, type ParseError } from "jsonc-parser";

export async function registerLocalOpenCode(
  configDirectory: string,
  pluginDirectory: string,
): Promise<string> {
  const candidates = [
    join(configDirectory, "opencode.json"),
    join(configDirectory, "opencode.jsonc"),
  ] as const;
  const configPath = candidates.find(candidate => existsSync(candidate)) ?? candidates[0];
  const text = existsSync(configPath)
    ? await readFile(configPath, "utf8")
    : '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';
  const errors: ParseError[] = [];
  const config: unknown = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0 || typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new TypeError(`Invalid OpenCode configuration: ${configPath}`);
  }
  const plugins: unknown = "plugins" in config ? config.plugins : [];
  if (!Array.isArray(plugins)) {
    throw new TypeError(`Invalid OpenCode plugins configuration: ${configPath}`);
  }
  // A distinct dev ID lets the local build coexist with a disabled published registration.
  const registered =
    plugins.at(-2) === "-aerovato.operator-memory" && plugins.at(-1) === pluginDirectory;
  const updated = registered
    ? text
    : ["-aerovato.operator-memory", pluginDirectory].reduce(
        (content, entry) =>
          applyEdits(
            content,
            modify(content, ["plugins", -1], entry, {
              formattingOptions: { tabSize: 2, insertSpaces: true },
            }),
          ),
        text,
      );
  await mkdir(configDirectory, { recursive: true });
  await writeFile(configPath, updated.endsWith("\n") ? updated : `${updated}\n`, { mode: 0o600 });
  return configPath;
}

if (import.meta.main) {
  const { $ } = await import("bun");
  const projectDirectory = resolve(import.meta.dirname, "..");
  await $`bun run install:helper`.cwd(projectDirectory);
  await $`bun run build:opencode-v2:dev`.cwd(projectDirectory);
  const configDirectory =
    process.env.OPENCODE_CONFIG_DIR
    ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode");
  const configPath = await registerLocalOpenCode(
    configDirectory,
    join(projectDirectory, "packages", "opencode-v2", "dist"),
  );
  console.log(
    `Configured local OpenCode development plugin in ${configPath}. Restart OpenCode to load it.`,
  );
}
