import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { NodeChildProcessSpawner, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import { afterEach, beforeEach, expect, test } from "vitest";

import { runCli } from "../src/cli.ts";
import { GitRunner } from "../src/git.ts";
import { NpmRegistry, NpmRegistryError } from "../src/npm-registry.ts";
import { detectInstallationChannel, upgradeHelper } from "../src/update.ts";
import type { CliContext, CliResult } from "../src/utils.ts";

const originalPath = process.env.PATH;
const originalCodexHome = process.env.CODEX_HOME;
let directory: string;
let context: CliContext;
let record: string;

beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), "operator-helper-install-"));
  const bin = join(directory, "bin");
  fs.mkdirSync(bin);
  record = join(directory, "record");
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  process.env.OPERATOR_TEST_RECORD = record;
  context = {
    cwd: directory,
    home: directory,
    xdgConfigHome: null,
    version: "1.2.3",
  };
});

afterEach(() => {
  process.env.PATH = originalPath;
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }
  delete process.env.OPERATOR_TEST_RECORD;
  fs.rmSync(directory, { recursive: true, force: true });
});

test.runIf(process.platform !== "win32")(
  "installs and verifies the Codex plugin through a managed npm marketplace",
  async () => {
    executable(
      "codex",
      `printf '%s|%s\n' "$NPM_CONFIG_MIN_RELEASE_AGE" "$*" >> "$OPERATOR_TEST_RECORD"
if [ "$1 $2 $3" = "plugin marketplace add" ]; then printf '{"marketplaceName":"operator-memory"}'; exit 0; fi
if [ "$1 $2 $3" = "plugin add aerovato@operator-memory" ]; then printf '{"pluginId":"aerovato@operator-memory"}'; exit 0; fi
printf '{"installed":[{"pluginId":"aerovato@operator-memory","installed":true,"enabled":true}]}'`,
    );

    const result = await execute(["install", "codex"], "4.5.6");
    const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");
    const marketplace = JSON.parse(
      fs.readFileSync(join(marketplaceRoot, ".agents", "plugins", "marketplace.json"), "utf8"),
    );

    expect(result).toEqual({
      exitCode: 0,
      output:
        "✓ Codex plugin installed and enabled\n"
        + "Start a new Codex session and approve the Operator hooks if prompted.",
    });
    expect(marketplace).toEqual({
      name: "operator-memory",
      plugins: [
        {
          name: "aerovato",
          source: {
            source: "npm",
            package: "@aerovato/operator-codex",
            version: "latest",
          },
          policy: { installation: "AVAILABLE" },
        },
      ],
    });
    expect(fs.readFileSync(record, "utf8")).toBe(
      `0|plugin marketplace add ${marketplaceRoot} --json\n`
        + "0|plugin add aerovato@operator-memory --json\n"
        + "0|plugin list --marketplace operator-memory --json\n",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "rejects a Codex installation that is not enabled",
  async () => {
    executable(
      "codex",
      `if [ "$1 $2 $3" = "plugin marketplace add" ]; then printf '{}'; exit 0; fi
if [ "$1 $2 $3" = "plugin add aerovato@operator-memory" ]; then printf '{}'; exit 0; fi
printf '{"installed":[{"pluginId":"aerovato@operator-memory","installed":true,"enabled":false}]}'`,
    );

    expect(await execute(["install", "codex"], "4.5.6")).toEqual({
      exitCode: 1,
      output: "✗ Codex plugin installation finished but the plugin is not installed and enabled",
    });
  },
);

test("preserves an unmanaged Codex marketplace", async () => {
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");
  fs.mkdirSync(marketplaceRoot, { recursive: true });
  fs.writeFileSync(join(marketplaceRoot, "user-file"), "user owned");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result).toEqual({
    exitCode: 1,
    output: `✗ Preserved unmanaged Codex marketplace at ${marketplaceRoot}`,
  });
  expect(fs.readFileSync(join(marketplaceRoot, "user-file"), "utf8")).toBe("user owned");
});

test.runIf(process.platform !== "win32")(
  "delegates Claude Code npm installation and updates to the repository marketplace",
  async () => {
    claudeExecutables('[{"id":"operator@operator-memory","enabled":true}]');
    const result = await execute(["install", "claude-code"], "4.5.6");
    expect(result).toEqual({
      exitCode: 0,
      output: "✓ Claude Code plugin installed and enabled\nStart a new Claude Code session.",
    });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "helper|help\n"
        + "claude|plugin marketplace add aerovato/operator-memory\n"
        + "claude|plugin install operator@operator-memory\n"
        + "claude|plugin update operator@operator-memory\n"
        + "claude|plugin list --json\n",
    );
    expect(await execute(["install", "claude-code"], "4.5.6")).toEqual(result);
    expect(fs.existsSync(join(directory, ".operator-helper"))).toBe(false);
  },
);

test("the repository marketplace points at the Claude Code npm package", () => {
  const manifest = JSON.parse(
    fs.readFileSync(join(import.meta.dirname, "../../../.claude-plugin/marketplace.json"), "utf8"),
  );
  expect(manifest.name).toBe("operator-memory");
  expect(manifest.plugins).toEqual([
    { name: "operator", source: { source: "npm", package: "@aerovato/operator-claude-code" } },
  ]);
});

test.runIf(process.platform !== "win32")(
  "rejects a Claude Code plugin that is not enabled",
  async () => {
    claudeExecutables('[{"id":"operator@operator-memory","enabled":false}]');
    expect(await execute(["install", "claude-code"], "4.5.6")).toEqual({
      exitCode: 1,
      output:
        "✗ Claude Code plugin installation finished but the plugin is not installed and enabled",
    });
  },
);

test.runIf(process.platform !== "win32")(
  "requires Operator Helper on PATH before installing the Claude Code package",
  async () => {
    claudeExecutables("[]");
    executable("operator-helper", "exit 1");
    expect(await execute(["install", "claude-code"], "4.5.6")).toEqual({
      exitCode: 1,
      output: "Operator Helper must be available on PATH",
    });
    expect(fs.existsSync(record)).toBe(false);
  },
);

test.runIf(process.platform !== "win32")(
  "reports native Claude Code installation failures",
  async () => {
    claudeExecutables("[]");
    executable(
      "claude",
      'if [ "$1 $2" = "plugin install" ]; then printf "Registry unavailable"; exit 1; fi',
    );
    expect(await execute(["install", "claude-code"], "4.5.6")).toEqual({
      exitCode: 1,
      output: "Registry unavailable",
    });
    expect(fs.readFileSync(record, "utf8")).toBe("helper|help\n");
  },
);

test.runIf(process.platform !== "win32")(
  "reports Claude Code CLI failures without claiming installation succeeded",
  async () => {
    claudeExecutables("[]");
    executable("claude", "printf 'Claude unavailable'; exit 1");
    expect(await execute(["install", "claude-code"], "4.5.6")).toEqual({
      exitCode: 1,
      output: "Claude unavailable",
    });
  },
);

test("registers the marketplace in config.toml when the Codex CLI is unavailable", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result).toEqual({
    exitCode: 0,
    output:
      "✓ Registered the Operator Codex marketplace\n"
      + "Codex CLI unavailable: install aerovato@operator-memory from the Codex plugins browser, then start a new session and approve the Operator hooks.",
  });
  expect(fs.readFileSync(join(codexHome, "config.toml"), "utf8")).toBe(
    `[marketplaces.operator-memory]\nsource_type = "local"\nsource = ${JSON.stringify(marketplaceRoot)}\n`,
  );
});

test("refreshes an existing marketplace table without touching other config", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    config,
    [
      'model = "gpt-5"',
      "",
      "[marketplaces.operator-memory]",
      'source_type = "local"',
      'source = "/old/path"',
      "",
      "[profiles.fast]",
      'model = "gpt-5-mini"',
      "",
    ].join("\n"),
  );
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  const content = fs.readFileSync(config, "utf8");
  expect(content).toContain(`source = ${JSON.stringify(marketplaceRoot)}`);
  expect(content).not.toContain("/old/path");
  expect(content).toContain('model = "gpt-5-mini"');
});

test("refuses config.toml that expresses marketplaces without tables", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    join(codexHome, "config.toml"),
    'marketplaces.operator-memory.source = "/old/path"\n',
  );

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result).toEqual({
    exitCode: 1,
    output:
      "✗ Could not register the Codex marketplace: config.toml expresses marketplaces without tables; refusing to edit it",
  });
});

test.runIf(process.platform !== "win32")(
  "replaces a marketplace table that ends the file without a following header",
  async () => {
    const codexHome = join(directory, "codex-home");
    process.env.CODEX_HOME = codexHome;
    const config = join(codexHome, "config.toml");
    fs.mkdirSync(codexHome, { recursive: true });
    fs.writeFileSync(
      config,
      ['model = "gpt-5"', "", "[marketplaces.operator-memory]", 'source = "/old/path"'].join("\n"),
    );
    const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

    const result = await execute(["install", "codex"], "4.5.6");

    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(config, "utf8")).toBe(
      [
        'model = "gpt-5"',
        "",
        `[marketplaces.operator-memory]`,
        `source_type = "local"`,
        `source = ${JSON.stringify(marketplaceRoot)}`,
        "",
      ].join("\n"),
    );
  },
);

test("replaces stale keys and comments inside an existing marketplace table", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    config,
    [
      "# user comment",
      "[marketplaces.operator-memory]",
      "# stale comment",
      'source_type = "git"',
      'source = "https://example.com/old"',
      'ref = "main"',
      "",
      "[profiles.fast]",
      'model = "gpt-5-mini"',
    ].join("\n"),
  );
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  const content = fs.readFileSync(config, "utf8");
  expect(content).toContain("# user comment");
  expect(content).not.toContain("stale comment");
  expect(content).not.toContain("git");
  expect(content).not.toContain('ref = "main"');
  expect(content).toContain(`source = ${JSON.stringify(marketplaceRoot)}`);
  expect(content).toContain('model = "gpt-5-mini"');
});

test("appends without disturbing other marketplace tables", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    config,
    ["[marketplaces.personal]", 'source_type = "local"', 'source = "/personal/plugins"', ""].join(
      "\n",
    ),
  );
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  const content = fs.readFileSync(config, "utf8");
  expect(content).toContain('source = "/personal/plugins"');
  expect(
    content.endsWith(
      `[marketplaces.operator-memory]\nsource_type = "local"\nsource = ${JSON.stringify(marketplaceRoot)}\n`,
    ),
  ).toBe(true);
});

test("appends when the config has no trailing newline", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(config, 'model = "gpt-5"');
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(config, "utf8")).toBe(
    `model = "gpt-5"\n[marketplaces.operator-memory]\nsource_type = "local"\nsource = ${JSON.stringify(marketplaceRoot)}\n`,
  );
});

test("recognizes a spaced marketplace table header", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    config,
    ["[ marketplaces.operator-memory ]", 'source = "/old/path"', ""].join("\n"),
  );
  const marketplaceRoot = join(directory, ".operator-helper", "codex-marketplace");

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  const content = fs.readFileSync(config, "utf8");
  expect(content).not.toContain("/old/path");
  expect(content).toContain(`source = ${JSON.stringify(marketplaceRoot)}`);
});

test("refuses an inline marketplaces table", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    join(codexHome, "config.toml"),
    'marketplaces = { operator-memory = { source_type = "local", source = "/old" } }\n',
  );

  const result = await execute(["install", "codex"], "4.5.6");

  expect(result).toEqual({
    exitCode: 1,
    output:
      "✗ Could not register the Codex marketplace: config.toml expresses marketplaces without tables; refusing to edit it",
  });
});

test("produces identical content when run twice", async () => {
  const codexHome = join(directory, "codex-home");
  process.env.CODEX_HOME = codexHome;
  const config = join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(config, 'model = "gpt-5"\n');

  await execute(["install", "codex"], "4.5.6");
  const first = fs.readFileSync(config, "utf8");
  const result = await execute(["install", "codex"], "4.5.6");

  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(config, "utf8")).toBe(first);
});

test.runIf(process.platform !== "win32")(
  "installs the latest OpenCode plugin globally",
  async () => {
    const cache = join(
      directory,
      ".cache",
      "opencode",
      "packages",
      "@aerovato",
      "operator-opencode@latest",
    );
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(join(cache, "stale"), "stale");
    executable(
      "opencode",
      'printf "%s\\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"\nprintf "installed"',
    );

    const result = await execute(["install", "opencode"], "4.5.6");

    expect(result).toEqual({ exitCode: 0, output: "installed" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "plugin @aerovato/operator-opencode@latest --global --force\n0",
    );
    expect(fs.existsSync(cache)).toBe(false);
  },
);

test.runIf(process.platform !== "win32")(
  "clears the OpenCode plugin cache from XDG_CACHE_HOME",
  async () => {
    const xdgCacheHome = join(directory, "custom-cache");
    const cache = join(
      xdgCacheHome,
      "opencode",
      "packages",
      "@aerovato",
      "operator-opencode@latest",
    );
    process.env.XDG_CACHE_HOME = xdgCacheHome;
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(join(cache, "stale"), "stale");
    executable("opencode", 'printf "installed"');

    const result = await execute(["install", "opencode"], "4.5.6");

    expect(result).toEqual({ exitCode: 0, output: "installed" });
    expect(fs.existsSync(cache)).toBe(false);
  },
);

test.runIf(process.platform !== "win32")(
  "installs the latest OpenCode V2 plugin globally",
  async () => {
    executable(
      "opencode",
      'printf "%s\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"\nprintf "installed"',
    );

    const result = await execute(["install", "opencode-v2"], "4.5.6");

    expect(result).toEqual({ exitCode: 0, output: "installed" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "plugin add @aerovato/operator-opencode-v2@latest\n0",
    );
  },
);

test.runIf(process.platform !== "win32")("installs the Pi plugin globally", async () => {
  executable("pi", 'printf "%s" "$*" > "$OPERATOR_TEST_RECORD"\nprintf "installed"');

  const result = await execute(["install", "pi"], "4.5.6");

  expect(result).toEqual({ exitCode: 0, output: "installed" });
  expect(fs.readFileSync(record, "utf8")).toBe("install npm:@aerovato/operator-pi");
});

test.runIf(process.platform !== "win32")(
  "installs the DeepSeek plugin into Web and Desktop independently",
  async () => {
    executable(
      "dsh",
      `printf '%s\n' "$*" >> "$OPERATOR_TEST_RECORD"
printf '%s installed' "$3"`,
    );

    const result = await execute(["install", "deepseek"], "4.5.6");

    expect(result).toEqual({
      exitCode: 0,
      output:
        "✓ Web: web installed\n✓ Desktop: desktop installed\n\n"
        + "To install a profile manually, run:\n\n"
        + "  dsh plugin --profile <profile-name> add @aerovato/operator-deepseek\n\n"
        + "If the desktop profile was not installed, quit the desktop application and install manually.",
    });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "plugin --profile web add @aerovato/operator-deepseek\n"
        + "plugin --profile desktop add @aerovato/operator-deepseek\n",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "preserves Web installation when the Desktop runtime is unavailable",
  async () => {
    executable(
      "dsh",
      `printf '%s\n' "$*" >> "$OPERATOR_TEST_RECORD"
if [ "$3" = "desktop" ]; then printf 'Desktop runtime required' >&2; exit 7; fi
printf 'web installed'`,
    );

    const result = await execute(["install", "deepseek"], "4.5.6");

    expect(result).toEqual({
      exitCode: 1,
      output:
        "✓ Web: web installed\n✗ Desktop: Desktop runtime required\n\n"
        + "To install a profile manually, run:\n\n"
        + "  dsh plugin --profile <profile-name> add @aerovato/operator-deepseek\n\n"
        + "If the desktop profile was not installed, quit the desktop application and install manually.",
    });
    expect(fs.readFileSync(record, "utf8")).toContain("--profile desktop");
  },
);

test.runIf(process.platform !== "win32")(
  "attempts Desktop installation after Web installation fails",
  async () => {
    executable(
      "dsh",
      `if [ "$3" = "web" ]; then printf 'web failed' >&2; exit 5; fi
printf 'desktop installed'`,
    );

    expect(await execute(["install", "deepseek"], "4.5.6")).toEqual({
      exitCode: 1,
      output:
        "✗ Web: web failed\n✓ Desktop: desktop installed\n\n"
        + "To install a profile manually, run:\n\n"
        + "  dsh plugin --profile <profile-name> add @aerovato/operator-deepseek\n\n"
        + "If the desktop profile was not installed, quit the desktop application and install manually.",
    });
  },
);

test.runIf(process.platform !== "win32")(
  "explicitly upgrades through Bun with the minimum release age disabled",
  async () => {
    executable(
      "bun",
      'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nif [ "$1 $2 $3" = "pm bin --global" ]; then printf "/nonexistent/bun/bin"; exit 0; fi\nprintf "%s" "$*" > "$OPERATOR_TEST_RECORD"',
    );
    executable(
      "npm",
      'if [ "$1 $2" = "prefix --global" ]; then printf "/nonexistent/npm/prefix"; exit 0; fi\nexit 1',
    );

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "updated", latest: "4.5.6" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "add --global --minimum-release-age 0 @aerovato/operator-helper@4.5.6",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "explicitly upgrades through npm with the minimum release age disabled",
  async () => {
    executable("bun", "exit 1");
    executable(
      "npm",
      'if [ "$1" = "list" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nif [ "$1 $2" = "prefix --global" ]; then printf "/nonexistent/npm/prefix"; exit 0; fi\nprintf "%s\\n%s" "$*" "$NPM_CONFIG_MIN_RELEASE_AGE" > "$OPERATOR_TEST_RECORD"',
    );

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "updated", latest: "4.5.6" });
    expect(fs.readFileSync(record, "utf8")).toBe(
      "install --global @aerovato/operator-helper@4.5.6\n0",
    );
  },
);

test.runIf(process.platform !== "win32")(
  "reports an unknown installation channel when an update is available",
  async () => {
    executable("bun", "exit 1");
    executable("npm", "exit 1");

    const result = await update("4.5.6");

    expect(result).toEqual({ status: "unknown", latest: "4.5.6" });
  },
);

test("does not inspect installation channels without a newer version", async () => {
  const result = await update("1.2.3");

  expect(result).toEqual({ status: "current" });
});

test("version checks the registry without installing or caching", async () => {
  let checks = 0;
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  const registryLayer = Layer.succeed(
    NpmRegistry.Service,
    NpmRegistry.Service.of({
      latestVersion: () => {
        checks += 1;
        return Effect.succeed("4.5.6");
      },
    }),
  );
  const git = Layer.succeed(
    GitRunner.Service,
    GitRunner.Service.of({ run: () => Effect.succeed("") }),
  );
  const run = () =>
    Effect.runPromise(
      runCli(["version"], context).pipe(
        Effect.provide(
          Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, child, git, registryLayer),
        ),
      ),
    );

  await expect(run()).resolves.toEqual({
    exitCode: 0,
    output: "Operator Helper 1.2.3\nUpdate available: 4.5.6. Run `operator-helper upgrade`.",
  });
  await expect(run()).resolves.toEqual({
    exitCode: 0,
    output: "Operator Helper 1.2.3\nUpdate available: 4.5.6. Run `operator-helper upgrade`.",
  });
  expect(checks).toBe(2);
  expect(fs.existsSync(record)).toBe(false);
});

test("version reports current and registry errors", async () => {
  expect(await execute(["version"], "1.2.3")).toEqual({
    exitCode: 0,
    output: "Operator Helper 1.2.3 is up to date.",
  });

  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  const layers = Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer,
    child,
    Layer.succeed(GitRunner.Service, GitRunner.Service.of({ run: () => Effect.succeed("") })),
    Layer.succeed(
      NpmRegistry.Service,
      NpmRegistry.Service.of({
        latestVersion: () => Effect.fail(new NpmRegistryError({ message: "Registry unavailable" })),
      }),
    ),
  );
  expect(
    await Effect.runPromise(runCli(["version"], context).pipe(Effect.provide(layers))),
  ).toEqual({
    exitCode: 1,
    output: "Operator Helper 1.2.3\nRegistry unavailable",
  });
});

test.runIf(process.platform !== "win32")("upgrade reports an up-to-date helper", async () => {
  const result = await execute(["upgrade"], "1.2.3");

  expect(result).toEqual({
    exitCode: 0,
    output: "Operator Helper 1.2.3 is up to date.",
  });
});

test.runIf(process.platform !== "win32")("reports failed explicit installation", async () => {
  executable(
    "bun",
    'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nexit 1',
  );
  executable("npm", "exit 1");

  const result = await update("4.5.6");

  expect(result).toEqual({
    status: "failed",
    message: "Operator Helper update failed: exit code 1.",
  });
});

test.runIf(process.platform !== "win32")(
  "resolves the channel from the running executable when both trees contain the package",
  async () => {
    // The prefix must match the fully resolved executable path because detection
    // realpaths the executable; macOS temp directories resolve through /private.
    const npmPrefix = join(fs.realpathSync(directory), "nvm", "versions", "node", "v22.23.2");
    const executablePath = join(
      directory,
      "nvm",
      "versions",
      "node",
      "v22.23.2",
      "bin",
      "operator-helper",
    );
    fs.mkdirSync(dirname(executablePath), { recursive: true });
    fs.writeFileSync(executablePath, "", { mode: 0o755 });
    executable(
      "bun",
      'if [ "$1 $2 $3" = "pm ls --global" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nif [ "$1 $2 $3" = "pm bin --global" ]; then printf "/nonexistent/bun/bin"; exit 0; fi\nexit 0',
    );
    executable(
      "npm",
      'if [ "$1" = "list" ]; then printf "@aerovato/operator-helper@1.2.3"; exit 0; fi\nif [ "$1 $2" = "prefix --global" ]; then printf "%s" "'
        + npmPrefix
        + '"; exit 0; fi\nexit 0',
    );

    const result = await channel(executablePath);

    expect(result).toBe("npm");
  },
);

function executable(name: string, body: string): void {
  const path = join(directory, "bin", name);
  fs.writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

function claudeExecutables(status: string): void {
  executable("operator-helper", 'printf "helper|%s\\n" "$*" >> "$OPERATOR_TEST_RECORD"');
  executable("npm", 'printf "unexpected npm call\\n" >> "$OPERATOR_TEST_RECORD"; exit 1');
  executable(
    "claude",
    `printf 'claude|%s\\n' "$*" >> "$OPERATOR_TEST_RECORD"
if [ "$1 $2" = "plugin list" ]; then printf '%s' '${status}'; fi`,
  );
}

function execute(arguments_: ReadonlyArray<string>, latest: string): Promise<CliResult> {
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  const git = Layer.succeed(
    GitRunner.Service,
    GitRunner.Service.of({ run: () => Effect.succeed("") }),
  );
  const layers = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, child, git, registry(latest));
  return Effect.runPromise(runCli(arguments_, context).pipe(Effect.provide(layers)));
}

function update(latest: string) {
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  return Effect.runPromise(
    upgradeHelper(context).pipe(Effect.provide(Layer.mergeAll(child, registry(latest)))),
  );
}

function channel(executablePath: string) {
  const child = NodeChildProcessSpawner.layer.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );
  return Effect.runPromise(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      return yield* detectInstallationChannel(spawner, context.cwd, executablePath);
    }).pipe(Effect.provide(child)),
  );
}

function registry(version: string): Layer.Layer<NpmRegistry.Service> {
  return Layer.succeed(
    NpmRegistry.Service,
    NpmRegistry.Service.of({ latestVersion: () => Effect.succeed(version) }),
  );
}
