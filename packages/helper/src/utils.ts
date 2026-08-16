export type CliResult = {
  readonly exitCode: number;
  readonly output: string;
};

export type CliContext = {
  readonly cwd: string;
  readonly home: string;
  readonly xdgConfigHome: string | null;
  readonly version: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
