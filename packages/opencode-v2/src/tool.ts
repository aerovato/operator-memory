import { readOmission } from "@aerovato/operator-core/context/store";
import type { Context } from "@opencode/plugin/promise/plugin";
import { join } from "node:path";

export type ReadOmittedDeps = {
  // ~/.operator/state; the adapter computes it from the user home.
  readonly stateDirectory: string;
};

const OMISSION_ID_PATTERN = /^omitted-\d+$/;

function isOmissionID(contentID: string): boolean {
  return OMISSION_ID_PATTERN.test(contentID);
}

// Registers operator:read_omitted: recovers a trimmed payload from the
// omission store by content ID. The omission notices left in context name
// these IDs; without this tool they would be dead references.
export async function registerReadOmittedTool(
  context: Context,
  deps: ReadOmittedDeps,
): Promise<void> {
  await context.tool.transform(editor => {
    editor.namespace({
      name: "operator",
      description: "Operator Memory context management tools.",
    });
    editor.add({
      name: "read_omitted",
      description:
        "Read original tool input or output content omitted by Operator trimming or compaction. "
        + "This reads the snapshot of previously executed tool I/O; contents should be expected "
        + "to be stale. Only use it when stale content is strictly required and similar "
        + "information cannot be obtained via new tool calls.",
      input: {
        type: "object",
        properties: {
          contentID: {
            type: "string",
            description: "Omitted content ID. E.g.: omitted-001.",
          },
        },
        required: ["contentID"],
      },
      execute: async (input, toolContext) => {
        if (typeof input !== "object" || input === null || !("contentID" in input)) {
          return { content: "Missing required input: contentID." };
        }
        const contentID = (input as { contentID: unknown }).contentID;
        if (typeof contentID !== "string") {
          return { content: "Missing required input: contentID." };
        }
        if (!isOmissionID(contentID)) {
          return { content: `Invalid content ID: ${contentID}.` };
        }

        const stored = await readOmission(
          join(deps.stateDirectory, "omitted"),
          toolContext.sessionID,
          contentID,
        );
        if (!stored.ok) {
          return { content: `Could not read omitted content for Content ID: ${contentID}.` };
        }
        return {
          content: stored.value ?? `No omitted content found for Content ID: ${contentID}`,
        };
      },
    });
  });
}
