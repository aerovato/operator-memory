import { extname, join, relative, sep } from "node:path";

import { hasNodeErrorCode, type Result, success } from "../utils.ts";
import {
  checkOptionalReadableFile,
  checkReadableFile,
  readContent,
  readDirectory,
  readOptionalContent,
  type MemoryLoadError,
} from "./common.ts";
import {
  type FrontmatterError,
  type IndexFrontmatter,
  parseIndexFrontmatter,
} from "./frontmatter.ts";

export const PROJECT_PRIVATE_ROOT = ".operator";
export const PROJECT_SHARED_ROOT = ".operator-shared";

export type IndexDocument = {
  readonly path: string;
  readonly content: string;
  readonly frontmatter: Result<IndexFrontmatter, FrontmatterError>;
};

export type ProjectPartitionSnapshot = {
  readonly exists: boolean;
  readonly operatorInstructions: string | null;
  readonly catalog: string | null;
  readonly indexes: ReadonlyArray<IndexDocument>;
};

export type ProjectPartitionStatusSnapshot = {
  readonly exists: boolean;
};

export function loadProjectPartition(
  root: string,
  loadFiles: true,
): Promise<Result<ProjectPartitionSnapshot, MemoryLoadError>>;
export function loadProjectPartition(
  root: string,
  loadFiles: false,
): Promise<Result<ProjectPartitionStatusSnapshot, MemoryLoadError>>;

export async function loadProjectPartition(
  root: string,
  loadFiles: boolean,
): Promise<
  | Result<ProjectPartitionSnapshot, MemoryLoadError>
  | Result<ProjectPartitionStatusSnapshot, MemoryLoadError>
> {
  const directory = await readDirectory(root);
  if (!directory.ok) {
    return hasNodeErrorCode(directory.error.cause, "ENOENT")
      ? success(
          loadFiles
            ? { exists: false, operatorInstructions: null, catalog: null, indexes: [] }
            : { exists: false },
        )
      : directory;
  }

  if (!loadFiles) {
    for (const path of [join(root, "operator.md"), join(root, "catalog.md")]) {
      const file = await checkOptionalReadableFile(path);
      if (!file.ok) {
        return file;
      }
    }

    const indexRoot = join(root, "index");
    const indexPaths = await listMarkdownFiles(indexRoot, indexRoot);
    if (!indexPaths.ok) {
      return indexPaths;
    }
    for (const path of indexPaths.value) {
      const file = await checkReadableFile(path);
      if (!file.ok) {
        return file;
      }
    }
    return success({ exists: true });
  }

  const operatorInstructions = await readOptionalContent(join(root, "operator.md"));
  if (!operatorInstructions.ok) {
    return operatorInstructions;
  }

  const catalog = await readOptionalContent(join(root, "catalog.md"));
  if (!catalog.ok) {
    return catalog;
  }

  const indexes = await readIndexes(join(root, "index"));
  if (!indexes.ok) {
    return indexes;
  }

  return success({
    exists: true,
    operatorInstructions: operatorInstructions.value,
    catalog: catalog.value,
    indexes: indexes.value,
  });
}

async function readIndexes(
  root: string,
): Promise<Result<ReadonlyArray<IndexDocument>, MemoryLoadError>> {
  const paths = await listMarkdownFiles(root, root);
  if (!paths.ok) {
    return paths;
  }

  paths.value.sort(compareStrings);
  const indexes: IndexDocument[] = [];

  for (const path of paths.value) {
    const content = await readContent(path);
    if (!content.ok) {
      return content;
    }

    indexes.push({
      path: relative(root, path).split(sep).join("/"),
      content: content.value,
      frontmatter: parseIndexFrontmatter(content.value),
    });
  }

  return success(indexes);
}

async function listMarkdownFiles(
  root: string,
  directory: string,
): Promise<Result<string[], MemoryLoadError>> {
  const entries = await readDirectory(directory);
  if (!entries.ok) {
    return directory === root && hasNodeErrorCode(entries.error.cause, "ENOENT")
      ? success([])
      : entries;
  }

  const paths: string[] = [];
  for (const entry of entries.value) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedPaths = await listMarkdownFiles(root, path);
      if (!nestedPaths.ok) {
        return nestedPaths;
      }
      paths.push(...nestedPaths.value);
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      paths.push(path);
    }
  }

  return success(paths);
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}
