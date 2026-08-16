import { expect, test } from "vitest";

import type { MemorySnapshot } from "./memory/load.ts";
import type { ProjectPartitionSnapshot } from "./memory/project.ts";
import type { UserPartitionSnapshot } from "./memory/user.ts";
import { renderPreamble as renderMemoryPreamble } from "./preamble.ts";
import { PREAMBLE_PROMPT, PREAMBLE_TENETS } from "./prompts/preamble.ts";
import { PROJECT_CATALOG_TEMPLATE } from "./templates/project-catalog.ts";
import { PROJECT_INDEX_TEMPLATE } from "./templates/project-index.ts";
import { PROJECT_SUBINDEX_TEMPLATE } from "./templates/project-subindex.ts";
import { failure, success } from "./utils.ts";

test("embeds core document templates in fixed guidance", () => {
  expect(PREAMBLE_PROMPT).toContain(PROJECT_INDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT).toContain(PROJECT_SUBINDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT).toContain(PROJECT_CATALOG_TEMPLATE.trimEnd());
});

test("renders fixed guidance and the missing-catalog warning for empty memory", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  expect(renderPreamble(memory)).toBe(`${PREAMBLE_PROMPT}

${PREAMBLE_TENETS}

<operator-warning>
Neither the .operator nor .operator-shared directory exists. If the user requests significant amounts of work to be done on the project, ask the user to run /operator:project-init first to initialize Operator. If the user is not requesting work to be done, do not ask to initialize; they could simply be exploring.
</operator-warning>`);
});

test("renders conditional memory in authority and partition order", () => {
  const memory: LoadedMemorySnapshot = {
    shared: {
      exists: true,
      operatorInstructions: "shared instructions",
      catalog: "shared catalog",
      indexes: [
        {
          path: "index.md",
          content: "shared main index",
          frontmatter: success({ description: "Shared map", readIf: "Always" }),
        },
        {
          path: "packages/core.md",
          content: "subindex body must not be injected",
          frontmatter: failure({ kind: "invalid", message: "Invalid frontmatter" }),
        },
      ],
    },
    user: { exists: true, operatorInstructions: "user instructions" },
    private: {
      exists: true,
      operatorInstructions: "private instructions",
      catalog: "private catalog",
      indexes: [
        {
          path: "index.md",
          content: "private main index",
          frontmatter: success({ description: "Private map", readIf: "Private work" }),
        },
      ],
    },
  };

  expect(renderPreamble(memory)).toBe(`${PREAMBLE_PROMPT}

<operator-instructions>
Operator instruction contents from least to most authoritative:
<file-content path=".operator-shared/operator.md">
shared instructions
</file-content>
<file-content path="~/.operator/user/operator.md">
user instructions
</file-content>
<file-content path=".operator/operator.md">
private instructions
</file-content>
</operator-instructions>

<project-index>
.operator-shared/index/
├── index.md
│   Description: Shared map
│   Read If: Always
└── packages/core.md
    Error: Invalid frontmatter. Action: Open .operator-shared/index/packages/core.md and fix its description and read_if frontmatter.

Shared partition main index contents:
<file-content path=".operator-shared/index/index.md">
shared main index
</file-content>

.operator/index/
└── index.md
    Description: Private map
    Read If: Private work

Private partition main index contents:
<file-content path=".operator/index/index.md">
private main index
</file-content>
</project-index>

<partition-catalog>
<file-content path=".operator-shared/catalog.md">
shared catalog
</file-content>
<file-content path=".operator/catalog.md">
private catalog
</file-content>
</partition-catalog>

${PREAMBLE_TENETS}`);
});

test("renders identical bytes for the same snapshot", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: true, operatorInstructions: null, catalog: "catalog", indexes: [] },
    user: { exists: false, operatorInstructions: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  expect(renderPreamble(memory)).toBe(renderPreamble(memory));
});

test("renders index listing connectors and metadata for every valid index", () => {
  const memory: LoadedMemorySnapshot = {
    shared: {
      exists: true,
      operatorInstructions: null,
      catalog: "catalog",
      indexes: [
        {
          path: "index.md",
          content: "main index",
          frontmatter: success({ description: "Main", readIf: "Always" }),
        },
        {
          path: "packages/core.md",
          content: "core body",
          frontmatter: success({ description: "Core", readIf: "Core work" }),
        },
        {
          path: "packages/helper.md",
          content: "helper body",
          frontmatter: success({ description: "Helper", readIf: "CLI work" }),
        },
      ],
    },
    user: { exists: false, operatorInstructions: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).toContain(`.operator-shared/index/
├── index.md
│   Description: Main
│   Read If: Always
├── packages/core.md
│   Description: Core
│   Read If: Core work
└── packages/helper.md
    Description: Helper
    Read If: CLI work`);
  expect(preamble).toContain(`<file-content path=".operator-shared/index/index.md">
main index
</file-content>`);
  expect(preamble).not.toContain("core body");
  expect(preamble).not.toContain("helper body");
});

test("renders an index listing without a main index body", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null },
    private: {
      exists: true,
      operatorInstructions: null,
      catalog: "catalog",
      indexes: [
        {
          path: "source.md",
          content: "source body",
          frontmatter: success({ description: "Source", readIf: "Source work" }),
        },
      ],
    },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).toContain(`.operator/index/
└── source.md
    Description: Source
    Read If: Source work`);
  expect(preamble).not.toContain("partition main index contents:");
  expect(preamble).not.toContain("source body");
  expect(preamble).toContain(
    "Neither .operator/index/index.md nor .operator-shared/index/index.md exists",
  );
});

test("renders only available instructions and catalogs", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: true, operatorInstructions: null, catalog: "shared catalog", indexes: [] },
    user: { exists: true, operatorInstructions: "user instructions" },
    private: {
      exists: true,
      operatorInstructions: "private instructions",
      catalog: null,
      indexes: [],
    },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).not.toContain('<file-content path=".operator-shared/operator.md">');
  expect(preamble).toContain('<file-content path="~/.operator/user/operator.md">');
  expect(preamble).toContain('<file-content path=".operator/operator.md">');
  expect(preamble).toContain('<file-content path=".operator-shared/catalog.md">');
  expect(preamble).not.toContain('<file-content path=".operator/catalog.md">');
  expect(preamble).not.toContain("Neither .operator/catalog.md");
});

test("renders component warnings for an existing empty project partition", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null },
    private: { exists: true, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).not.toContain("Ask the user to run /operator:project-init");
  expect(preamble).toContain("ask the user to run /operator:index");
  expect(preamble).toContain("You must create and maintain a catalog.md");
  expect(preamble.indexOf(PREAMBLE_TENETS)).toBeLessThan(preamble.indexOf("<operator-warning>"));
});

test("renders only recovery diagnostics when any partition fails", () => {
  const rendered = renderMemoryPreamble({
    shared: success({
      exists: true,
      operatorInstructions: "must not be rendered",
      catalog: "must not be rendered",
      indexes: [],
    }),
    user: failure({ path: "/home/.operator/user/operator.md", cause: new Error("denied") }),
    private: failure({ path: "/project/.operator/index", cause: new Error("obstructed") }),
  });

  expect(rendered.loaded).toBe(false);
  expect(rendered.content).toContain("- Shared: Loaded");
  expect(rendered.content).toContain("- User: Error at /home/.operator/user/operator.md: denied");
  expect(rendered.content).toContain("- Private: Error at /project/.operator/index: obstructed");
  expect(rendered.content).toContain("MUST focus explicitly and exclusively");
  expect(rendered.content).toContain("operator-helper memory check");
  expect(rendered.content).not.toContain("must not be rendered");
  expect(rendered.content).not.toContain(PREAMBLE_TENETS);
});

type LoadedMemorySnapshot = {
  readonly shared: ProjectPartitionSnapshot;
  readonly user: UserPartitionSnapshot;
  readonly private: ProjectPartitionSnapshot;
};

function renderPreamble(memory: LoadedMemorySnapshot): string {
  const snapshot: MemorySnapshot = {
    shared: success(memory.shared),
    user: success(memory.user),
    private: success(memory.private),
  };
  return renderMemoryPreamble(snapshot).content;
}
