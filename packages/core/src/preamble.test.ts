import { expect, test, vi } from "vitest";

import type { MemorySnapshot } from "./memory/load.ts";
import type { ProjectPartitionSnapshot } from "./memory/project.ts";
import type { UserPartitionSnapshot } from "./memory/user.ts";
import { renderPreamble as renderMemoryPreamble } from "./preamble.ts";
import { PREAMBLE_PROMPT, PREAMBLE_TENETS } from "./prompts/preamble-v2.ts";
import { PREAMBLE_PROMPT_V21 } from "./prompts/preamble-v2-1.ts";
import { defaultSettings, type Settings } from "./settings.ts";
import { CATALOG_TEMPLATE } from "./templates/catalog.ts";
import { PROJECT_INDEX_TEMPLATE } from "./templates/project-index.ts";
import { PROJECT_SUBINDEX_TEMPLATE } from "./templates/project-subindex.ts";
import { failure, success } from "./utils.ts";

vi.mock("./preamble-rollout.ts", () => ({
  selectPreambleVersion: (beta: boolean) => (beta ? "2.1" : "2.0"),
}));

test("embeds core document templates in fixed guidance", () => {
  expect(PREAMBLE_PROMPT).toContain(PROJECT_INDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT).toContain(PROJECT_SUBINDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT).toContain(CATALOG_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT_V21).toContain(PROJECT_INDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT_V21).toContain(PROJECT_SUBINDEX_TEMPLATE.trimEnd());
  expect(PREAMBLE_PROMPT_V21).toContain(CATALOG_TEMPLATE.trimEnd());
});

test("renders the v2.1 candidate when the beta preamble is enabled", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null, catalog: null },
    private: { exists: true, operatorInstructions: null, catalog: "catalog", indexes: [] },
  };

  const preamble = renderSnapshot(memory, { preamble: { beta: true } }, null);

  expect(preamble).toContain('<operator-guidance version="2.1">');
  expect(preamble).toContain('<operator-tenets version="2.1">');
  expect(preamble).not.toContain('version="2.0"');
  expect(preamble).toContain(
    "If the project has substantive content and the user is not already running Project Init",
  );
  expect(preamble).toContain("- `assets/` — Binary files such as images and fonts");
});

test("warns about an unparseable settings file without blocking memory", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: true, operatorInstructions: "user instructions", catalog: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderSnapshot(memory, defaultSettings, "/home/.operator/settings.json");

  expect(preamble).toContain(
    "/home/.operator/settings.json could not be parsed, so Operator is using default settings.",
  );
  expect(preamble).toContain("user instructions");
  expect(preamble.indexOf(PREAMBLE_TENETS)).toBeLessThan(preamble.indexOf("<operator-warning>"));
});

test("renders fixed v2.0 guidance and the missing-catalog warning for empty memory", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null, catalog: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).toContain('<operator-guidance version="2.0">');
  expect(preamble).toContain('<operator-tenets version="2.0">');
  expect(preamble).not.toContain('version="1.1"');
  expect(preamble).toBe(`${PREAMBLE_PROMPT}

${PREAMBLE_TENETS}

<operator-warning>
The ~/.operator/user directory does not exist. If the user would benefit from cross-project user memory, ask the user to run /operator:user-init first to initialize the User Partition. If not needed, do not ask; they may be working without user memory intentionally.
</operator-warning>

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
    user: { exists: true, operatorInstructions: "user instructions", catalog: "user catalog" },
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

<user-catalog>
<file-content path="~/.operator/user/catalog.md">
user catalog
</file-content>
</user-catalog>

<partition-catalog>
<file-content path=".operator-shared/catalog.md">
shared catalog
</file-content>
<file-content path=".operator/catalog.md">
private catalog
</file-content>
</partition-catalog>

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

${PREAMBLE_TENETS}`);
});

test("renders identical bytes for the same snapshot", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: true, operatorInstructions: null, catalog: "catalog", indexes: [] },
    user: { exists: false, operatorInstructions: null, catalog: null },
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
    user: { exists: false, operatorInstructions: null, catalog: null },
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
    user: { exists: false, operatorInstructions: null, catalog: null },
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
    user: { exists: true, operatorInstructions: "user instructions", catalog: "user catalog" },
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
  expect(preamble).toContain('<file-content path="~/.operator/user/catalog.md">');
  expect(preamble).not.toContain('<file-content path=".operator/catalog.md">');
  expect(preamble).not.toContain("Neither .operator/catalog.md");
  expect(preamble).not.toContain("~/.operator/user/catalog.md does not");
});

test("renders component warnings for an existing empty project partition", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: false, operatorInstructions: null, catalog: null },
    private: { exists: true, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).not.toContain("Ask the user to run /operator:project-init");
  expect(preamble).toContain("offer to build the Project Index directly");
  expect(preamble).not.toContain("/operator:index");
  expect(preamble).toContain("You must create and maintain a catalog.md");
  expect(preamble.indexOf(PREAMBLE_TENETS)).toBeLessThan(preamble.indexOf("<operator-warning>"));
});

test("injects the user catalog without a project brain", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: true, operatorInstructions: null, catalog: "user catalog" },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).toContain("<user-catalog>");
  expect(preamble).toContain('<file-content path="~/.operator/user/catalog.md">');
  expect(preamble).not.toContain("<project-index>");
  expect(preamble).not.toContain("<partition-catalog>");
});

test("warns about a missing user catalog independently of project catalogs", () => {
  const memory: LoadedMemorySnapshot = {
    shared: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
    user: { exists: true, operatorInstructions: "user instructions", catalog: null },
    private: { exists: false, operatorInstructions: null, catalog: null, indexes: [] },
  };

  const preamble = renderPreamble(memory);

  expect(preamble).toContain("~/.operator/user/catalog.md does not");
  expect(preamble).not.toContain(
    "You must create and maintain a catalog.md to document any non-empty Project Brain partitions.",
  );
  expect(preamble).not.toContain("<user-catalog>");
});

test("renders v2.0 guidance and only recovery diagnostics on load failure", () => {
  const rendered = renderMemoryPreamble({
    shared: success({
      exists: true,
      operatorInstructions: "must not be rendered",
      catalog: "must not be rendered",
      indexes: [],
    }),
    user: failure({ path: "/home/.operator/user/operator.md", cause: new Error("denied") }),
    private: failure({ path: "/project/.operator/index", cause: new Error("obstructed") }),
    settings: defaultSettings,
    unparseableSettingsPath: null,
  });

  expect(rendered.loaded).toBe(false);
  expect(rendered.content).toContain('<operator-guidance version="2.0">');
  expect(rendered.content).toContain("- Shared: Loaded");
  expect(rendered.content).toContain("- User: Error at /home/.operator/user/operator.md: denied");
  expect(rendered.content).toContain("- Private: Error at /project/.operator/index: obstructed");
  expect(rendered.content).toContain("MUST resolve Operator memory loading");
  expect(rendered.content).toContain("operator-helper version");
  expect(rendered.content).toContain("operator-helper upgrade");
  expect(rendered.content).toContain("operator-helper memory check");
  expect(rendered.content).toContain("do not initialize absent partitions");
  expect(rendered.content).toContain("Preserve existing content");
  expect(rendered.content).toContain("stop and ask the user for guidance");
  expect(rendered.content).toContain("Resolve any additional load failures");
  expect(rendered.content).toContain("install or repair its global installation");
  expect(rendered.content).toContain("report the failing path or operation");
  expect(rendered.content).toContain("start a new session and resubmit their original request");
  expect(rendered.content).toContain("Do not resume the original task");
  expect(rendered.content).not.toContain("/operator:repair");
  expect(rendered.content).not.toContain("must not be rendered");
  expect(rendered.content).not.toContain(PREAMBLE_TENETS);
  expect(rendered.content).not.toContain(`<operator-tenets version="1.1">`);
});

type LoadedMemorySnapshot = {
  readonly shared: ProjectPartitionSnapshot;
  readonly user: UserPartitionSnapshot;
  readonly private: ProjectPartitionSnapshot;
};

function renderPreamble(memory: LoadedMemorySnapshot): string {
  return renderSnapshot(memory, defaultSettings, null);
}

function renderSnapshot(
  memory: LoadedMemorySnapshot,
  settings: Settings,
  unparseableSettingsPath: string | null,
): string {
  const snapshot: MemorySnapshot = {
    shared: success(memory.shared),
    user: success(memory.user),
    private: success(memory.private),
    settings,
    unparseableSettingsPath,
  };
  return renderMemoryPreamble(snapshot).content;
}
