import { parseDocument } from "yaml";

import { failure, getErrorMessage, isRecord, readString, type Result, success } from "../utils.ts";

const FRONTMATTER_PATTERN = /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)/;

export type IndexFrontmatter = {
  readonly description: string;
  readonly readIf: string;
};

export type FrontmatterError = {
  readonly kind: "missing" | "invalid";
  readonly message: string;
};

export function parseIndexFrontmatter(content: string): Result<IndexFrontmatter, FrontmatterError> {
  const source = FRONTMATTER_PATTERN.exec(content)?.[1];
  if (source === undefined) {
    return failure({ kind: "missing", message: "Frontmatter is missing" });
  }

  try {
    const document = parseDocument(source, { uniqueKeys: true });
    if (document.errors.length > 0) {
      return failure({
        kind: "invalid",
        message: document.errors.map(error => error.message).join("; "),
      });
    }

    const value: unknown = document.toJS();
    if (!isRecord(value)) {
      return failure({ kind: "invalid", message: "Frontmatter must be a YAML mapping" });
    }

    const description = readString(value, "description");
    const readIf = readString(value, "read_if");
    if (description === null || readIf === null) {
      return failure({
        kind: "invalid",
        message: "Frontmatter requires string description and read_if fields",
      });
    }
    if (description.trim() === "" || readIf.trim() === "") {
      return failure({
        kind: "invalid",
        message: "Frontmatter requires non-empty description and read_if fields",
      });
    }

    return success({ description, readIf });
  } catch (error) {
    return failure({ kind: "invalid", message: getErrorMessage(error) });
  }
}
