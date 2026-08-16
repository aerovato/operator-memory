import { PROJECT_CATALOG_TEMPLATE } from "@aerovato/operator-core/templates/project-catalog";
import { PROJECT_INDEX_TEMPLATE } from "@aerovato/operator-core/templates/project-index";
import { PROJECT_SUBINDEX_TEMPLATE } from "@aerovato/operator-core/templates/project-subindex";

import { PROJECT_INDEX_SETUP_TEMPLATE } from "./templates/project/index-setup.ts";
import { PROJECT_OPERATOR_TEMPLATE } from "./templates/project/operator.ts";
import { PROJECT_SETUP_TEMPLATE } from "./templates/project/setup.ts";
import { PROJECT_SHARED_README_TEMPLATE } from "./templates/project/shared-readme.ts";
import { USER_OPERATOR_TEMPLATE } from "./templates/user/operator.ts";
import { USER_SETUP_TEMPLATE } from "./templates/user/setup.ts";

export enum TemplatePath {
  UserOperator = "user/operator.md",
  UserSetup = "user/setup.md",
  ProjectOperator = "project/operator.md",
  ProjectIndex = "project/index.md",
  ProjectSubindex = "project/subindex.md",
  ProjectCatalog = "project/catalog.md",
  ProjectSetup = "project/setup.md",
  ProjectIndexSetup = "project/index-setup.md",
  ProjectSharedReadme = "project/shared-readme.md",
}

const TEMPLATES = {
  [TemplatePath.UserOperator]: USER_OPERATOR_TEMPLATE,
  [TemplatePath.UserSetup]: USER_SETUP_TEMPLATE,
  [TemplatePath.ProjectOperator]: PROJECT_OPERATOR_TEMPLATE,
  [TemplatePath.ProjectIndex]: PROJECT_INDEX_TEMPLATE,
  [TemplatePath.ProjectSubindex]: PROJECT_SUBINDEX_TEMPLATE,
  [TemplatePath.ProjectCatalog]: PROJECT_CATALOG_TEMPLATE,
  [TemplatePath.ProjectSetup]: PROJECT_SETUP_TEMPLATE,
  [TemplatePath.ProjectIndexSetup]: PROJECT_INDEX_SETUP_TEMPLATE,
  [TemplatePath.ProjectSharedReadme]: PROJECT_SHARED_README_TEMPLATE,
} satisfies Record<TemplatePath, string>;

export function readTemplate(path: TemplatePath): string {
  return TEMPLATES[path];
}
