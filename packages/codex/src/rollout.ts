import { closeSync, type Dirent, fstatSync, openSync, readdirSync, readSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";

type Fields = Readonly<Record<string, unknown>>;

type HistoryBase = {
  readonly rolloutId: string;
  readonly endByteOffset: number;
  readonly endOrdinal: number;
};

type SegmentSummary = {
  readonly turnStarts: number;
  readonly hasPriorHistory: boolean;
  readonly hasOperatorPreamble: boolean;
};

type RolloutSegment = {
  readonly sessionId: string;
  readonly historyBase: HistoryBase | null;
  readonly summary: SegmentSummary;
};

type HistoryChain = readonly [SegmentSummary, ...SegmentSummary[]];

const ROLLOUT_FILENAME =
  /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-([\da-f-]{36})(?:_([\da-f-]{36}))?\.jsonl$/;
const MAX_SEGMENT_BYTES = 1024 * 1024;
const NON_MODEL_RECORDS = new Set([
  "turn_context",
  "world_state",
  "realtime_item",
  "security_risk_score",
  "token_usage_record",
]);
const TURN_START_EVENTS = new Set(["task_started", "turn_started"]);
const PRIOR_TURN_EVENTS = new Set([
  "task_complete",
  "turn_complete",
  "turn_aborted",
  "user_message",
  "thread_rolled_back",
  "context_compacted",
]);

function fields(value: unknown): Fields | null {
  return typeof value === "object" && value !== null ? (value as Fields) : null;
}

function readHistoryBase(metadata: Fields): HistoryBase | null {
  const value = metadata.history_base;
  if (value === undefined || value === null) return null;
  const base = fields(value);
  const id = base?.thread_id;
  const offset = base?.end_byte_offset;
  const ordinal = base?.end_ordinal_exclusive;
  if (
    typeof id !== "string"
    || typeof offset !== "number"
    || !Number.isSafeInteger(offset)
    || offset <= 0
    || typeof ordinal !== "number"
    || !Number.isSafeInteger(ordinal)
    || ordinal <= 0
  )
    throw new Error("Unrecognized Codex history base");
  return { rolloutId: id, endByteOffset: offset, endOrdinal: ordinal };
}

function isOperatorPreamble(item: Fields): boolean {
  if (item.role !== "developer" || !Array.isArray(item.content)) return false;
  return item.content.some(content => {
    const text = fields(content)?.text;
    return (
      typeof text === "string" && /^<operator-(guidance|diagnostic)[\s>]/.test(text.trimStart())
    );
  });
}

function readSegment(path: string, cutoff: HistoryBase | null): RolloutSegment | null {
  const filename = ROLLOUT_FILENAME.exec(basename(path));
  if (filename === null) return null;

  const file = openSync(path, "r");
  try {
    const stat = fstatSync(file);
    const length = cutoff?.endByteOffset ?? stat.size;
    if (!stat.isFile() || length <= 0 || length > MAX_SEGMENT_BYTES || length > stat.size)
      return null;
    const bytes = Buffer.alloc(length);
    if (readSync(file, bytes, 0, length, 0) !== length || bytes[length - 1] !== 10) return null;

    const [first, ...lines] = bytes.toString("utf8").slice(0, -1).split("\n");
    const header = fields(JSON.parse(first ?? ""));
    const metadata = fields(header?.payload);
    if (
      header?.type !== "session_meta"
      || metadata?.history_mode !== "paginated"
      || typeof metadata.id !== "string"
      || metadata.id !== filename[1]
    )
      return null;

    const historyBase = readHistoryBase(metadata);
    let ordinal = historyBase?.endOrdinal ?? 0;
    if (header.ordinal !== ordinal) return null;

    let turnStarts = 0;
    let hasPriorHistory = false;
    let hasOperatorPreamble = false;
    for (const line of lines) {
      const record = fields(JSON.parse(line));
      ordinal += 1;
      if (record === null || record.ordinal !== ordinal) return null;
      const payload = fields(record.payload);
      if (record.type === "event_msg" && typeof payload?.type === "string") {
        if (TURN_START_EVENTS.has(payload.type)) turnStarts += 1;
        hasPriorHistory ||= PRIOR_TURN_EVENTS.has(payload.type);
      } else if (record.type === "response_item" && payload !== null) {
        // Codex writes initial context and can run other hooks before SessionStart returns.
        const contextMessage =
          (payload.type === "message" && (payload.role === "developer" || payload.role === "user"))
          || (payload.type === "additional_tools" && payload.role === "developer");
        hasPriorHistory ||= turnStarts === 0 || !contextMessage;
        hasOperatorPreamble ||= isOperatorPreamble(payload);
      } else if (record.type === "compacted") {
        hasPriorHistory = true;
      } else if (typeof record.type !== "string" || !NON_MODEL_RECORDS.has(record.type)) {
        return null;
      }
    }

    if (cutoff !== null && ordinal + 1 !== cutoff.endOrdinal) return null;
    return {
      sessionId: metadata.id,
      historyBase,
      summary: { turnStarts, hasPriorHistory, hasOperatorPreamble },
    };
  } finally {
    closeSync(file);
  }
}

function indexRollouts(roots: readonly string[]): ReadonlyMap<string, string | null> {
  const paths = new Map<string, string | null>();
  const directories = [...roots];
  for (let directory = directories.pop(); directory !== undefined; directory = directories.pop()) {
    const entries = listDirectory(directory);
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        directories.push(path);
      } else if (entry.isFile()) {
        const filename = ROLLOUT_FILENAME.exec(entry.name);
        const id = filename?.[2] ?? filename?.[1];
        if (id !== undefined) paths.set(id, paths.has(id) ? null : path);
      }
    }
  }
  return paths;
}

function listDirectory(path: string): Dirent[] {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch (error) {
    if (fields(error)?.code !== "ENOENT") throw error;
    return [];
  }
}

export function readHistoryChain(transcriptPath: string, sessionId: string): HistoryChain | null {
  if (!isAbsolute(transcriptPath)) return null;
  try {
    const current = readSegment(transcriptPath, null);
    if (current?.sessionId !== sessionId) return null;
    const history: [SegmentSummary, ...SegmentSummary[]] = [current.summary];
    let base = current.historyBase;
    if (base === null) return history;

    // Active rollouts live under sessions/YYYY/MM/DD, and ancestors can be archived.
    const sessions = dirname(dirname(dirname(dirname(transcriptPath))));
    if (basename(sessions) !== "sessions") return null;
    const paths = indexRollouts([sessions, join(dirname(sessions), "archived_sessions")]);
    const seen = new Set<string>();
    while (base !== null) {
      const path = paths.get(base.rolloutId);
      if (path == null || seen.has(path)) return null;
      seen.add(path);
      const prefix = readSegment(path, base);
      if (prefix === null) return null;
      history.push(prefix.summary);
      base = prefix.historyBase;
    }
    return history;
  } catch {
    return null;
  }
}

// Codex reports a revert as resume. An empty retained prefix lets the hook recover
// before the new first prompt without duplicating a preamble that survived.
export function canRecoverPreamble(history: HistoryChain): boolean {
  const [current, ...ancestors] = history;
  return (
    current.turnStarts === 1
    && ancestors.every(segment => segment.turnStarts === 0)
    && history.every(segment => !segment.hasPriorHistory && !segment.hasOperatorPreamble)
  );
}
