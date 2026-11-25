import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { readOptionalContent } from "./memory/common.ts";
import { isRecord } from "./utils.ts";

export type Settings = {
  readonly preamble: {
    readonly beta: boolean;
  };
};

export const defaultSettings = {
  preamble: {
    beta: false,
  },
} as const satisfies Settings;

const settingsSchema = z.object({
  preamble: z.object({
    beta: z.boolean(),
  }),
});

// Unknown keys are stripped and missing or invalid sections fall back to their defaults, so the
// effective settings are always complete.
const effectiveSettingsSchema = z.object({
  preamble: settingsSchema.shape.preamble.catch(defaultSettings.preamble),
});

const SECTION_NAMES = Object.keys(settingsSchema.shape);

export type SettingsSnapshot = {
  readonly settings: Settings;
  // Path of a settings file that is not valid JSON. The file is left untouched and default
  // settings are in use.
  readonly unparseableSettingsPath: string | null;
};

// Loads ~/.operator/settings.json below `homeDirectory`. A missing file is normal. Unknown keys and
// invalid values are removed from the file; an unparseable file is never rewritten.
export async function loadSettings(homeDirectory: string): Promise<SettingsSnapshot> {
  const path = join(homeDirectory, ".operator", "settings.json");
  const content = await readOptionalContent(path);
  if (!content.ok || content.value === null) {
    return { settings: defaultSettings, unparseableSettingsPath: null };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content.value);
  } catch {
    return { settings: defaultSettings, unparseableSettingsPath: path };
  }

  if (!isRecord(raw)) {
    await writeFile(path, "{}\n", "utf8").catch(() => undefined);
    return { settings: defaultSettings, unparseableSettingsPath: null };
  }

  const repaired = renderRepairedSettings(raw);
  if (repaired !== null) {
    await writeFile(path, repaired, "utf8").catch(() => undefined);
  }
  return {
    settings: effectiveSettingsSchema.parse(raw),
    unparseableSettingsPath: null,
  };
}

// Returns the replacement file content holding only recognized settings, or null when `raw`
// contains nothing that has to be removed.
function renderRepairedSettings(raw: Record<string, unknown>): string | null {
  const recognized: Record<string, Record<string, unknown>> = {};
  let needsRepair = Object.keys(raw).some(name => !SECTION_NAMES.includes(name));

  for (const [sectionName, sectionSchema] of Object.entries(settingsSchema.shape)) {
    const section = raw[sectionName];
    if (section === undefined) {
      continue;
    }
    if (!isRecord(section)) {
      needsRepair = true;
      continue;
    }

    const fields: Record<string, unknown> = {};
    for (const [name, fieldSchema] of Object.entries(sectionSchema.shape)) {
      const value = section[name];
      if (value === undefined) {
        continue;
      }
      if (fieldSchema.safeParse(value).success) {
        fields[name] = value;
      } else {
        needsRepair = true;
      }
    }
    if (Object.keys(fields).length > 0) {
      recognized[sectionName] = fields;
    }
  }

  return needsRepair ? `${JSON.stringify(recognized, null, 2)}\n` : null;
}
