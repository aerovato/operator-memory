import { expect, test } from "vitest";

import { readTemplate, TemplatePath } from "../src/templates.ts";

test("reads an embedded template by its enum path", () => {
  expect(readTemplate(TemplatePath.ProjectIndex)).toContain("# {Private|Shared} Project Index");
  expect(readTemplate(TemplatePath.ProjectSubindex)).toContain("## Coverage");
  expect(readTemplate(TemplatePath.ProjectCatalog)).toContain(
    "# {Private|Shared} Partition Catalog",
  );
  expect(readTemplate(TemplatePath.ProjectIndex)).not.toContain("## Guidelines");
});

test("setup guides allow optional topics to remain unfilled", () => {
  const userGuide = readTemplate(TemplatePath.UserSetup);
  expect(userGuide).toContain("`Skip` or `Leave unfilled`");
  expect(userGuide).toContain("do not infer an answer or add a default");
  expect(userGuide).toContain("answers would materially change the resulting instructions");
  expect(userGuide).toContain("Do not manufacture false choices");

  const projectGuide = readTemplate(TemplatePath.ProjectSetup);
  expect(projectGuide).toContain("do not infer an answer or add a default");
  expect(projectGuide).toContain("answers would materially change the resulting instructions");
  expect(projectGuide).toContain("Do not manufacture false choices");
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
