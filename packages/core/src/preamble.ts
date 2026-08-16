import type { MemorySnapshot } from "./memory/load.ts";
import type { IndexDocument, ProjectPartitionSnapshot } from "./memory/project.ts";
import type { UserPartitionSnapshot } from "./memory/user.ts";
import { PREAMBLE_PROMPT, PREAMBLE_TENETS } from "./prompts/preamble.ts";
import { getErrorMessage } from "./utils.ts";

const SHARED_ROOT = ".operator-shared";
const PRIVATE_ROOT = ".operator";
const USER_INSTRUCTIONS_PATH = "~/.operator/user/operator.md";

export type RenderedPreamble = {
  readonly content: string;
  readonly loaded: boolean;
};

type LoadedMemorySnapshot = {
  readonly shared: ProjectPartitionSnapshot;
  readonly user: UserPartitionSnapshot;
  readonly private: ProjectPartitionSnapshot;
};

export function renderPreamble(memory: MemorySnapshot): RenderedPreamble {
  if (!memory.shared.ok || !memory.user.ok || !memory.private.ok) {
    return {
      content: `${PREAMBLE_PROMPT}\n\n${renderLoadDiagnostic(memory)}`,
      loaded: false,
    };
  }

  const loaded = {
    shared: memory.shared.value,
    user: memory.user.value,
    private: memory.private.value,
  };
  const sections = [PREAMBLE_PROMPT];
  const warnings: string[] = [];

  const instructions = renderInstructions(loaded);
  if (instructions !== null) {
    sections.push(instructions);
  }

  if (!loaded.shared.exists && !loaded.private.exists) {
    warnings.push(
      `<operator-warning>
Neither the .operator nor .operator-shared directory exists. If the user requests significant amounts of work to be done on the project, ask the user to run /operator:project-init first to initialize Operator. If the user is not requesting work to be done, do not ask to initialize; they could simply be exploring.
</operator-warning>`,
    );
  } else {
    const indexes = renderIndexes(loaded);
    const catalogs = renderCatalogs(loaded);

    if (indexes !== null) {
      sections.push(indexes);
    }
    if (catalogs !== null) {
      sections.push(catalogs);
    }
    if (!hasMainIndex(loaded)) {
      warnings.push(
        `<operator-warning>
Neither .operator/index/index.md nor .operator-shared/index/index.md exists. If the project is not in an empty state, ask the user to run /operator:index to initialize a project index before performing any work.
</operator-warning>`,
      );
    }
    if (catalogs === null) {
      warnings.push(
        `<operator-warning>
Neither .operator/catalog.md nor .operator-shared/catalog.md exists. You must create and maintain a catalog.md to document any non-empty Project Brain partitions.
</operator-warning>`,
      );
    }
  }

  sections.push(PREAMBLE_TENETS);
  for (const warning of warnings) {
    sections.push(warning);
  }

  return { content: sections.join("\n\n"), loaded: true };
}

function hasMainIndex(memory: LoadedMemorySnapshot): boolean {
  return [memory.shared, memory.private].some(partition =>
    partition.indexes.some(index => index.path === "index.md"),
  );
}

function renderLoadDiagnostic(memory: MemorySnapshot): string {
  const status = (name: string, result: MemorySnapshot[keyof MemorySnapshot]): string =>
    result.ok
      ? `- ${name}: Loaded Successfully`
      : `- ${name}: Error at ${result.error.path}: ${getErrorMessage(result.error.cause)}`;

  return `<operator-diagnostic>
Operator memory failed to load. No memory files were included in this preamble.

Loading status:
${status("Shared", memory.shared)}
${status("User", memory.user)}
${status("Private", memory.private)}

IMPORTANT: You MUST focus explicitly and exclusively on fixing Operator memory loading before proceeding with the user's requested work; otherwise, user and project instructions will not be loaded and you may not perform according to the user's wishes.

Use the error paths and causes above to repair the affected partitions, then run \`operator-helper memory check\` to validate the full load. If the check succeeds, read the applicable Operator Instructions, Project Indexes, and Partition Catalogs before resuming the user's work. If you cannot resolve the loading failure, stop and ask the user for guidance.
</operator-diagnostic>`;
}

function renderInstructions(memory: LoadedMemorySnapshot): string | null {
  const files: string[] = [];

  if (memory.shared.operatorInstructions !== null) {
    files.push(renderFile(`${SHARED_ROOT}/operator.md`, memory.shared.operatorInstructions));
  }
  if (memory.user.operatorInstructions !== null) {
    files.push(renderFile(USER_INSTRUCTIONS_PATH, memory.user.operatorInstructions));
  }
  if (memory.private.operatorInstructions !== null) {
    files.push(renderFile(`${PRIVATE_ROOT}/operator.md`, memory.private.operatorInstructions));
  }

  return files.length === 0
    ? null
    : `<operator-instructions>
Operator instruction contents from least to most authoritative:
${files.join("\n")}
</operator-instructions>`;
}

function renderIndexes(memory: LoadedMemorySnapshot): string | null {
  const partitions: string[] = [];
  const shared = renderPartitionIndex(memory.shared, SHARED_ROOT, "Shared");
  const privatePartition = renderPartitionIndex(memory.private, PRIVATE_ROOT, "Private");

  if (shared !== null) {
    partitions.push(shared);
  }
  if (privatePartition !== null) {
    partitions.push(privatePartition);
  }

  return partitions.length === 0
    ? null
    : `<project-index>
${partitions.join("\n\n")}
</project-index>`;
}

function renderPartitionIndex(
  partition: ProjectPartitionSnapshot,
  root: string,
  label: string,
): string | null {
  if (partition.indexes.length === 0) {
    return null;
  }

  const sections = [renderIndexListing(root, partition.indexes)];
  const mainIndex = partition.indexes.find(index => index.path === "index.md");
  if (mainIndex !== undefined) {
    sections.push(
      `${label} partition main index contents:\n${renderFile(`${root}/index/index.md`, mainIndex.content)}`,
    );
  }

  return sections.join("\n\n");
}

function renderIndexListing(root: string, indexes: ReadonlyArray<IndexDocument>): string {
  const lines = [`${root}/index/`];

  for (const [position, index] of indexes.entries()) {
    const last = position === indexes.length - 1;
    lines.push(`${last ? "└──" : "├──"} ${index.path}`);

    if (index.frontmatter.ok) {
      const indent = last ? "    " : "│   ";
      lines.push(`${indent}Description: ${index.frontmatter.value.description}`);
      lines.push(`${indent}Read If: ${index.frontmatter.value.readIf}`);
    } else {
      const indent = last ? "    " : "│   ";
      lines.push(
        `${indent}Error: Invalid frontmatter. Action: Open ${root}/index/${index.path} and fix its description and read_if frontmatter.`,
      );
    }
  }

  return lines.join("\n");
}

function renderCatalogs(memory: LoadedMemorySnapshot): string | null {
  const files: string[] = [];

  if (memory.shared.catalog !== null) {
    files.push(renderFile(`${SHARED_ROOT}/catalog.md`, memory.shared.catalog));
  }
  if (memory.private.catalog !== null) {
    files.push(renderFile(`${PRIVATE_ROOT}/catalog.md`, memory.private.catalog));
  }

  return files.length === 0
    ? null
    : `<partition-catalog>
${files.join("\n")}
</partition-catalog>`;
}

function renderFile(path: string, content: string): string {
  return `<file-content path="${path}">
${content}
</file-content>`;
}
