import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";

import { loadMemorySnapshot } from "@aerovato/operator-core/memory/load";
import { renderPreamble } from "@aerovato/operator-core/preamble";

import { runCli } from "../src/cli.ts";
import { GitError } from "../src/git.ts";
import { readTemplate, TemplatePath } from "../src/templates.ts";
import type { CliContext, CliResult } from "../src/utils.ts";
import { makeGitRunnerLayer } from "./mocks/git-runner.ts";

let directory: string;
let context: CliContext;
let configuredIgnore: string | null = null;
let tracked: ReadonlyArray<string> = [];
const gitLayer = makeGitRunnerLayer(arguments_ => {
  if (arguments_.includes("core.excludesFile")) {
    return configuredIgnore === null
      ? Effect.fail(new GitError({ message: "unset" }))
      : Effect.succeed(configuredIgnore);
  }
  return Effect.succeed(tracked.join("\n"));
});
const services = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, gitLayer);

beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), "operator-helper-cli-"));
  context = {
    cwd: join(directory, "project"),
    home: join(directory, "home"),
    xdgConfigHome: null,
    version: "1.2.3",
  };
  fs.mkdirSync(context.cwd, { recursive: true });
  mockGit([], null);
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

test("routes help, version, and invalid commands", async () => {
  const help = await executeCli(["help"], context);
  expect(help.output).toContain("operator-helper user status     Show User Partition status");
  expect(help.output).toContain("operator-helper project init    Initialize project partitions");
  expect(help.output).toContain("operator-helper index status    Show Private and Shared main");
  expect(help.output).toContain("operator-helper index lint      Check Project Index structure");
  expect(help.output).toContain("operator-helper memory check    Check that all Operator memory");
  expect(help.output).toContain("operator-helper preamble        Render the Operator preamble");
  expect(help.output).toContain("operator-helper install code-puppy");
  expect(help.output).not.toContain("operator-helper upgrade");
  expect(help.output).not.toContain("templates index");
  expect((await executeCli(["version"], context)).output).toBe("1.2.3");
  expect((await executeCli(["--help"], context)).exitCode).toBe(2);
  expect((await executeCli(["-h"], context)).exitCode).toBe(2);
  expect((await executeCli(["--version"], context)).exitCode).toBe(2);
  expect((await executeCli(["-v"], context)).exitCode).toBe(2);
  expect((await executeCli(["bad", "command"], context)).exitCode).toBe(2);
});

test("formats help as plaintext", async () => {
  const help = (await executeCli(["help"], context)).output;
  expect(help).toContain("Operator Helper");
  expect(help).toContain("COMMANDS\n\n");
  expect(help).toContain("operator-helper user status     Show User Partition status");
  expect(help).not.toContain("FLAGS");
  expect(help).not.toContain("\u001B");
});

test("reports, initializes, preserves, and guides the user partition", async () => {
  const missing = await executeCli(["user", "status"], context);
  expect(missing.output).toContain("⚠ User Partition Missing");

  const initialized = await executeCli(["user", "init"], context);
  expect(initialized.exitCode).toBe(0);
  expect(initialized.output).toBe(
    "✓ User Partition Initialized\n"
      + "Created  ~/.operator/user/operator.md\n"
      + "Created  ~/.operator/user/catalog.md",
  );
  expect(fs.readFileSync(resolvePath("/home/.operator/user/operator.md"), "utf8")).toBe(
    readTemplate(TemplatePath.UserOperator),
  );
  expect(fs.readFileSync(resolvePath("/home/.operator/user/catalog.md"), "utf8")).toBe(
    readTemplate(TemplatePath.UserCatalog),
  );
  if (process.platform !== "win32") {
    expect(fs.statSync(resolvePath("/home/.operator")).mode & 0o777).toBe(0o700);
  }

  const status = await executeCli(["user", "status"], context);
  expect(status.exitCode).toBe(0);
  expect(status.output).toContain("✓ User Partition Found");
  expect(status.output).toContain("User Instructions");
  expect(status.output).toContain("User Catalog");
  expect(status.output).toContain("~/.operator/user/catalog.md (");
  expect(status.output).toContain("Freeform Content");
  expect(status.output).not.toContain("/operator:user-init");

  fs.writeFileSync(resolvePath("/home/.operator/user/operator.md"), "custom");
  expect((await executeCli(["user", "init"], context)).output).toContain("Preserved");
  expect(fs.readFileSync(resolvePath("/home/.operator/user/operator.md"), "utf8")).toBe("custom");

  fs.rmSync(resolvePath("/home/.operator/user/catalog.md"));
  const incomplete = await executeCli(["user", "status"], context);
  expect(incomplete.exitCode).toBe(0);
  expect(incomplete.output).toContain("Missing (~/.operator/user/catalog.md)");
  expect(incomplete.output).toContain("/operator:user-init");

  expect((await executeCli(["user", "guide"], context)).output).toBe(
    `Follow the agent instructions below to complete User Setup.\n\n${readTemplate(TemplatePath.UserSetup)}`,
  );
});

test("reports a user instruction path obstruction", async () => {
  fs.mkdirSync(resolvePath("/home/.operator/user/operator.md"), { recursive: true });
  const result = await executeCli(["user", "status"], context);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("Expected a file, found directory");
});

test.runIf(process.platform !== "win32")("restricts an existing user Operator root", async () => {
  fs.mkdirSync(resolvePath("/home/.operator"), { recursive: true, mode: 0o755 });
  fs.chmodSync(resolvePath("/home/.operator"), 0o755);

  await executeCli(["user", "init"], context);

  expect(fs.statSync(resolvePath("/home/.operator")).mode & 0o777).toBe(0o700);
});

test("initializes Private content without creating the Shared partition", async () => {
  const result = await executeCli(["project", "init"], context);
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("Created  .operator/index/index.md");
  expect(result.output).toContain("Project Shared Not Initialized");
  expect(fs.readFileSync(resolvePath("/project/.operator/operator.md"), "utf8")).toBe(
    readTemplate(TemplatePath.ProjectOperator),
  );
  expect(fs.existsSync(resolvePath("/project/.operator-shared"))).toBe(false);
  expect(fs.readFileSync(resolvePath("/home/.config/git/ignore"), "utf8")).toContain(".operator/");

  fs.writeFileSync(resolvePath("/project/.operator/operator.md"), "custom");
  const repeated = await executeCli(["project", "init"], context);
  expect(repeated.output).toContain("Preserved  .operator/operator.md");
  expect(fs.readFileSync(resolvePath("/project/.operator/operator.md"), "utf8")).toBe("custom");
  expect(fs.existsSync(resolvePath("/project/.operator-shared"))).toBe(false);
});

test("creates and preserves the README in an existing Shared partition", async () => {
  fs.mkdirSync(resolvePath("/project/.operator-shared"), { recursive: true });

  const initialized = await executeCli(["project", "init"], context);
  expect(initialized.exitCode).toBe(0);
  expect(initialized.output).toContain("Project Shared Found");
  expect(initialized.output).toContain("Created  .operator-shared/README.md");
  expect(fs.readFileSync(resolvePath("/project/.operator-shared/README.md"), "utf8")).toBe(
    readTemplate(TemplatePath.ProjectSharedReadme),
  );

  fs.writeFileSync(resolvePath("/project/.operator-shared/README.md"), "custom");
  const repeated = await executeCli(["project", "init"], context);
  expect(repeated.output).toContain("Preserved  .operator-shared/README.md");
  expect(fs.readFileSync(resolvePath("/project/.operator-shared/README.md"), "utf8")).toBe(
    "custom",
  );
});

test("reports Shared partition and file obstructions", async () => {
  fs.writeFileSync(resolvePath("/project/.operator-shared"), "blocked");
  const blockedRoot = await executeCli(["project", "init"], context);
  expect(blockedRoot.exitCode).toBe(1);
  expect(blockedRoot.output).toContain("Project Shared Failed");
  expect(blockedRoot.output).toContain("Expected a directory, found file");

  fs.rmSync(resolvePath("/project/.operator-shared"));
  fs.mkdirSync(resolvePath("/project/.operator-shared/README.md"), { recursive: true });
  fs.mkdirSync(resolvePath("/project/.operator-shared/catalog.md"), { recursive: true });
  const blockedFiles = await executeCli(["project", "init"], context);
  expect(blockedFiles.exitCode).toBe(1);
  expect(blockedFiles.output).toContain(".operator-shared/README.md");
  expect(blockedFiles.output).toContain(".operator-shared/catalog.md");
  expect(blockedFiles.output).toContain("Expected a file, found directory");
});

test("reports detailed project file write failures and continues", async () => {
  fs.mkdirSync(resolvePath("/project/.operator/operator.md"), { recursive: true });

  const result = await executeCli(["project", "init"], context);

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("Failed");
  expect(result.output).toContain(".operator/operator.md");
  expect(result.output).toContain("Expected a file, found directory");
  expect(fs.readFileSync(resolvePath("/project/.operator/catalog.md"), "utf8")).toBe(
    readTemplate(TemplatePath.ProjectCatalog),
  );
  expect(fs.readFileSync(resolvePath("/project/.operator/index/index.md"), "utf8")).toBe(
    readTemplate(TemplatePath.ProjectIndex),
  );
});

test("uses a configured global ignore and appends the exact pattern", async () => {
  const ignore = resolvePath("/custom/ignore");
  seed({ "/custom/ignore": ".operator*\n" });
  mockGit([], `${ignore}\n`);
  const result = await executeCli(["project", "init"], context);
  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(ignore, "utf8")).toBe(
    ".operator*\n# Operator: Ignore private partition\n.operator/\n",
  );
});

test("reports project files, freeform content, ignore, and tracked private files", async () => {
  seed({
    "/project/.operator/operator.md": "abc",
    "/project/.operator/index/nested/core.md": "index",
    "/project/.operator/notes/plan.md": "plan",
    "/project/.operator-shared/README.md": "readme",
    "/home/.config/git/ignore": ".operator/\n",
  });
  mockGit([".operator/operator.md"], null);

  const result = await executeCli(["project", "status"], context);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain(".operator/operator.md (3 bytes)");
  expect(result.output.match(/Freeform Content\s+1 files/g)).toHaveLength(2);
  expect(result.output).toContain("Project Private Has Tracked Files");
});

test("renders main index status without listing subindexes", async () => {
  seed({
    "/project/.operator/index/index.md": "---\ndescription: Main\nread_if: Always\n---\n# Private",
    "/project/.operator/index/nested/api.md": "# API",
  });

  const result = await executeCli(["index", "status"], context);
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain(".operator-shared/index/index.md  Missing");
  expect(result.output).toContain(".operator/index/index.md         Found");
  expect(result.output).not.toContain("Description:");
  expect(result.output).not.toContain("Read If:");
  expect(result.output).not.toContain("nested/api.md");
});

test("reports a missing Project Brain without creating files", async () => {
  const result = await executeCli(["index", "status"], context);
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("Project Brain Missing");
  expect(fs.existsSync(resolvePath("/project/.operator"))).toBe(false);
});

test("checks full memory loading and reports partition errors independently", async () => {
  const missing = await executeCli(["memory", "check"], context);
  expect(missing.exitCode).toBe(0);
  expect(missing.output).toContain("✓ Shared: Uninitialized");
  expect(missing.output).toContain("✓ User: Uninitialized");
  expect(missing.output).toContain("✓ Private: Uninitialized");
  expect(missing.output).toContain("No issues detected.");

  seed({
    "/project/.operator-shared/operator.md": "shared",
    "/home/.operator/user/operator.md": "user",
    "/project/.operator/operator.md": "private",
  });
  const loaded = await executeCli(["memory", "check"], context);
  expect(loaded.exitCode).toBe(0);
  expect(loaded.output).toContain("✓ Shared: Loaded");
  expect(loaded.output).toContain("✓ User: Loaded");
  expect(loaded.output).toContain("✓ Private: Loaded");
  expect(loaded.output).toContain("No issues detected.");
  expect(loaded.output).not.toContain("\u001B");

  fs.rmSync(resolvePath("/project/.operator"), { recursive: true });
  fs.rmSync(resolvePath("/project/.operator-shared"), { recursive: true });
  fs.writeFileSync(resolvePath("/project/.operator"), "obstructed");
  fs.writeFileSync(resolvePath("/project/.operator-shared"), "obstructed");
  const failed = await executeCli(["memory", "check"], context);
  expect(failed.exitCode).toBe(1);
  expect(failed.output).toContain("✗ Shared: Error");
  expect(failed.output).toContain("✗ Private: Error");
  expect(failed.output).toContain(resolvePath("/project/.operator"));
  expect(failed.output).toContain(resolvePath("/project/.operator-shared"));
  expect(failed.output).not.toContain("No issues detected.");
});

test("renders the canonical preamble for normal and failed memory loads", async () => {
  seed({
    "/project/.operator/operator.md": "private instructions",
    "/home/.operator/user/operator.md": "user instructions",
  });
  const loadedSnapshot = await loadMemorySnapshot(context.cwd, context.home, true);
  expect(await executeCli(["preamble"], context)).toEqual({
    exitCode: 0,
    output: renderPreamble(loadedSnapshot).content,
  });

  fs.rmSync(resolvePath("/project/.operator"), { recursive: true });
  fs.writeFileSync(resolvePath("/project/.operator"), "obstructed");
  const failedSnapshot = await loadMemorySnapshot(context.cwd, context.home, true);
  const diagnostic = await executeCli(["preamble"], context);
  expect(diagnostic).toEqual({
    exitCode: 0,
    output: renderPreamble(failedSnapshot).content,
  });
  expect(diagnostic.output).toContain("<operator-diagnostic>");
});

test("lints frontmatter, shared private references, titles, and non-Markdown files", async () => {
  seed({
    "/project/.operator-shared/index/index.md":
      '---\ndescription: Shared\nread_if: ""\n---\n# Project Index\n.operator/private.md',
    "/project/.operator-shared/index/data.json": "{}",
    "/project/.operator-shared/index/nested/empty.md":
      '---\ndescription: ""\nread_if: Sometimes\n---\n# Empty',
    "/project/.operator/index/index.md": "---\ndescription: Private\n---\n# Project Index",
  });

  const result = await executeCli(["index", "lint"], context);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("Empty frontmatter field: read_if");
  expect(result.output).toContain("Empty frontmatter field: description");
  expect(result.output).toContain("Missing frontmatter field: read_if");
  expect(result.output).toContain("Shared index references private path (.operator/)");
  expect(result.output).toContain("Non-Markdown file in index tree");
  expect(result.output).toContain('Main index title should explicitly state "Shared"');
  expect(result.output).toContain('Main index title should explicitly state "Private"');
});

test("returns success for lint warnings without errors", async () => {
  seed({ "/project/.operator/index/notes.txt": "notes" });
  const result = await executeCli(["index", "lint"], context);
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("⚠ .operator/index/notes.txt");
});

test("prints project and index guides", async () => {
  const projectGuide = (await executeCli(["project", "guide"], context)).output;
  expect(projectGuide).toContain("# Project Setup");
  expect(projectGuide).toContain(readTemplate(TemplatePath.ProjectSharedReadme).trimEnd());
  expect(projectGuide).not.toContain("~/.operator/templates");
  expect((await executeCli(["index", "guide"], context)).output).toContain("# Project Index Setup");
  expect(fs.existsSync(resolvePath("/home/.operator"))).toBe(false);
});

function mockGit(tracked: string[], configuredIgnore: string | null): void {
  setGitState(tracked, configuredIgnore);
}

function setGitState(trackedFiles: ReadonlyArray<string>, ignorePath: string | null): void {
  tracked = trackedFiles;
  configuredIgnore = ignorePath;
}

function executeCli(arguments_: ReadonlyArray<string>, cliContext: CliContext): Promise<CliResult> {
  return Effect.runPromise(runCli(arguments_, cliContext).pipe(Effect.provide(services)));
}

function seed(files: Readonly<Record<string, string>>): void {
  for (const [path, content] of Object.entries(files)) {
    const absolutePath = resolvePath(path);
    fs.mkdirSync(dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
}

function resolvePath(path: string): string {
  for (const [root, absoluteRoot] of [
    ["/project", context.cwd],
    ["/home", context.home],
    ["/custom", join(directory, "custom")],
  ] as const) {
    if (path === root || path.startsWith(`${root}/`)) {
      return join(absoluteRoot, path.slice(root.length));
    }
  }
  throw new Error(`Unknown test path: ${path}`);
}
