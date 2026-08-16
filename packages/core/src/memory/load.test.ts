import { dirname, join } from "node:path";

import { fs, vol } from "memfs";
import { beforeEach, expect, test, vi } from "vitest";

import { loadMemorySnapshot, type MemorySnapshot } from "./load.ts";
import type { ProjectPartitionSnapshot } from "./project.ts";
import type { UserPartitionSnapshot } from "./user.ts";

vi.mock("node:fs/promises", async () => {
  const { fs: memoryFileSystem } = await import("memfs");
  return {
    access: memoryFileSystem.promises.access,
    readdir: memoryFileSystem.promises.readdir,
    readFile: memoryFileSystem.promises.readFile,
    stat: memoryFileSystem.promises.stat,
  };
});

const PROJECT_DIRECTORY = "/project";
const HOME_DIRECTORY = "/home";

beforeEach(() => {
  vol.reset();
  fs.mkdirSync(PROJECT_DIRECTORY, { recursive: true });
  fs.mkdirSync(HOME_DIRECTORY, { recursive: true });
});

test("loads an empty memory snapshot when all optional paths are absent", async () => {
  const result = unwrap(await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true));

  expect(result).toEqual({
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  });

  const status = await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, false);
  expect(status).toEqual({
    shared: { ok: true, value: { exists: false } },
    user: { ok: true, value: { exists: false } },
    private: { ok: true, value: { exists: false } },
  });
});

test("recognizes an existing empty project partition", async () => {
  fs.mkdirSync(join(PROJECT_DIRECTORY, ".operator"));

  const result = unwrap(await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true));

  expect(result.private.exists).toBe(true);
  expect(result.shared.exists).toBe(false);
});

test("loads core documents and recursive indexes in stable path order", async () => {
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator-shared", "operator.md"),
    "shared instructions",
  );
  await writeDocument(join(PROJECT_DIRECTORY, ".operator-shared", "catalog.md"), "shared catalog");
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator-shared", "index", "packages", "core.md"),
    "---\ndescription: Core package\nread_if: Editing core\n---\n# Core",
  );
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator-shared", "index", "index.md"),
    "---\r\ndescription: Main index\r\nread_if: Always\r\n---\r\n# Index",
  );
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator-shared", "index", "notes.txt"),
    "not an index",
  );
  await writeDocument(
    join(HOME_DIRECTORY, ".operator", "user", "operator.md"),
    "user instructions",
  );
  await writeDocument(join(PROJECT_DIRECTORY, ".operator", "operator.md"), "private instructions");
  await writeDocument(join(PROJECT_DIRECTORY, ".operator", "catalog.md"), "private catalog");

  const result = unwrap(await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true));

  expect(result.shared.operatorInstructions).toBe("shared instructions");
  expect(result.shared.catalog).toBe("shared catalog");
  expect(result.shared.indexes.map(index => index.path)).toEqual(["index.md", "packages/core.md"]);
  expect(result.shared.indexes[0]?.frontmatter).toEqual({
    ok: true,
    value: { description: "Main index", readIf: "Always" },
  });
  expect(result.user.operatorInstructions).toBe("user instructions");
  expect(result.private.operatorInstructions).toBe("private instructions");
  expect(result.private.catalog).toBe("private catalog");
});

test("returns frontmatter errors for missing, malformed, incomplete, and empty metadata", async () => {
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator", "index", "missing.md"),
    "# Missing frontmatter",
  );
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator", "index", "malformed.md"),
    "---\ndescription: [\nread_if: Broken\n---\n# Malformed",
  );
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator", "index", "typed.md"),
    "---\ndescription: 42\nread_if: Valid string\n---\n# Typed",
  );
  await writeDocument(
    join(PROJECT_DIRECTORY, ".operator", "index", "empty.md"),
    '---\ndescription: ""\nread_if: "   "\n---\n# Empty',
  );

  const result = unwrap(await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true));

  const empty = result.private.indexes[0];
  const malformed = result.private.indexes[1];
  const missing = result.private.indexes[2];
  const typed = result.private.indexes[3];

  expect(empty?.frontmatter).toEqual({
    ok: false,
    error: {
      kind: "invalid",
      message: "Frontmatter requires non-empty description and read_if fields",
    },
  });
  expect(malformed?.path).toBe("malformed.md");
  expect(malformed?.frontmatter.ok).toBe(false);
  if (malformed?.frontmatter.ok === false) {
    expect(malformed.frontmatter.error.kind).toBe("invalid");
  }
  expect(missing?.path).toBe("missing.md");
  expect(missing?.frontmatter).toEqual({
    ok: false,
    error: { kind: "missing", message: "Frontmatter is missing" },
  });
  expect(typed?.path).toBe("typed.md");
  expect(typed?.frontmatter).toEqual({
    ok: false,
    error: {
      kind: "invalid",
      message: "Frontmatter requires string description and read_if fields",
    },
  });
});

test("returns an error when an index path is obstructed", async () => {
  const obstructedPath = join(PROJECT_DIRECTORY, ".operator", "index");
  await writeDocument(obstructedPath, "not a directory");

  const result = await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true);

  expect(result.shared.ok).toBe(true);
  expect(result.user.ok).toBe(true);
  expect(result.private.ok).toBe(false);
  if (result.private.ok) {
    return;
  }

  expect(result.private.error.path).toBe(obstructedPath);
  expect(result.private.error.cause).toBeInstanceOf(Error);
});

test("returns every full partition error", async () => {
  const sharedRoot = join(PROJECT_DIRECTORY, ".operator-shared");
  const userRoot = join(HOME_DIRECTORY, ".operator", "user");
  const privateRoot = join(PROJECT_DIRECTORY, ".operator");
  await writeDocument(sharedRoot, "obstructed");
  await writeDocument(userRoot, "obstructed");
  await writeDocument(privateRoot, "obstructed");

  const result = await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, true);

  expect(result.shared.ok).toBe(false);
  expect(result.user.ok).toBe(false);
  expect(result.private.ok).toBe(false);
  if (!result.shared.ok && !result.user.ok && !result.private.ok) {
    expect(result.shared.error.path).toBe(sharedRoot);
    expect(result.user.error.path).toBe(join(userRoot, "operator.md"));
    expect(result.private.error.path).toBe(privateRoot);
  }
});

test("loads independent partition statuses while validating memory structure", async () => {
  fs.mkdirSync(join(HOME_DIRECTORY, ".operator", "user", "operator.md"), { recursive: true });
  await writeDocument(join(PROJECT_DIRECTORY, ".operator", "index"), "not a directory");
  fs.mkdirSync(join(PROJECT_DIRECTORY, ".operator-shared", "operator.md"), { recursive: true });

  const status = await loadMemorySnapshot(PROJECT_DIRECTORY, HOME_DIRECTORY, false);

  expect(status.user.ok).toBe(false);
  expect(status.private.ok).toBe(false);
  expect(status.shared.ok).toBe(false);
  if (!status.user.ok) {
    expect(status.user.error.path).toBe(join(HOME_DIRECTORY, ".operator", "user", "operator.md"));
  }
  if (!status.private.ok) {
    expect(status.private.error.path).toBe(join(PROJECT_DIRECTORY, ".operator", "index"));
  }
  if (!status.shared.ok) {
    expect(status.shared.error.path).toBe(
      join(PROJECT_DIRECTORY, ".operator-shared", "operator.md"),
    );
  }
});

async function writeDocument(path: string, content: string): Promise<void> {
  await fs.promises.mkdir(dirname(path), { recursive: true });
  await fs.promises.writeFile(path, content, { encoding: "utf8" });
}

function unwrap(snapshot: MemorySnapshot): {
  readonly shared: ProjectPartitionSnapshot;
  readonly user: UserPartitionSnapshot;
  readonly private: ProjectPartitionSnapshot;
} {
  expect(snapshot.shared.ok).toBe(true);
  expect(snapshot.user.ok).toBe(true);
  expect(snapshot.private.ok).toBe(true);
  if (!snapshot.shared.ok || !snapshot.user.ok || !snapshot.private.ok) {
    throw new Error("Expected every partition to load");
  }
  return {
    shared: snapshot.shared.value,
    user: snapshot.user.value,
    private: snapshot.private.value,
  };
}
