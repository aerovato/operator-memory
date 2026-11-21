import { expect, test } from "vitest";

import { readTemplate, TemplatePath } from "../src/templates.ts";

test("reads an embedded template by its enum path", () => {
  expect(readTemplate(TemplatePath.ProjectIndex)).toContain("# {Private|Shared} Project Index");
  expect(readTemplate(TemplatePath.ProjectSubindex)).toContain("## Coverage");
  expect(readTemplate(TemplatePath.ProjectCatalog)).toContain(
    "# {User|Private|Shared} Partition Catalog",
  );
  expect(readTemplate(TemplatePath.ProjectIndex)).not.toContain("## Guidelines");
});

test("user setup allows optional topics to remain unfilled", () => {
  const userGuide = readTemplate(TemplatePath.UserSetup);
  expect(userGuide).toContain("`Skip` or `Leave unfilled`");
  expect(userGuide).toContain("do not infer an answer or add a default");
  expect(userGuide).toContain("answers would materially change the resulting instructions");
  expect(userGuide).toContain("Do not manufacture false choices");
});

test("project setup configures instructions and offers migration before indexing", () => {
  const projectGuide = readTemplate(TemplatePath.ProjectSetup);
  expect(projectGuide).toContain("configure `operator.md` directly");
  expect(projectGuide).toContain("every project without an established sharing policy");
  expect(projectGuide).toContain("The final report is the first time to offer sharing");
  expect(projectGuide).toMatch(/If the purpose or essential context is unclear[^.]*interview/);
  expect(projectGuide).toContain("ask directly in chat and wait for the answer");
  expect(projectGuide).toContain("skip completed phases");
  expect(projectGuide).toContain("keep and skip a current index");
  expect(projectGuide).toContain("wait for approval before dispatching workers");
  expect(projectGuide).toContain("Straightforward plans proceed automatically");
  expect(projectGuide).toContain("exactly one worker per index file, including the main index");
  expect(projectGuide).toContain("workers already have the fixed preamble");
  expect(projectGuide).toContain("The main agent's only index edits are to those links");
  expect(projectGuide).not.toContain("`operator-helper index init`");
  expect(projectGuide).toMatch(
    /## Phase 1: Configure Instructions[\s\S]*## Phase \d: Existing Agent Documentation[\s\S]*## Phase \d: Index the Project[\s\S]*## Phase \d: Final Report[\s\S]*### Actions and Configuration[\s\S]*### Questions[\s\S]*### Next Steps/,
  );
});

test("setup guides embed seeds and do not point at disk templates", () => {
  const userGuide = readTemplate(TemplatePath.UserSetup);
  expect(userGuide).toContain(readTemplate(TemplatePath.UserOperator).trimEnd());
  expect(userGuide).not.toContain("~/.operator/templates");

  const projectGuide = readTemplate(TemplatePath.ProjectSetup);
  expect(projectGuide).toContain(readTemplate(TemplatePath.ProjectOperator).trimEnd());
  expect(projectGuide).toContain(readTemplate(TemplatePath.ProjectSharedReadme).trimEnd());
  expect(projectGuide).not.toContain("~/.operator/templates");

  expect(readTemplate(TemplatePath.ProjectIndexSetup)).not.toContain("~/.operator/templates");
});
