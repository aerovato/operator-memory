import Table from "cli-table3";

const BORDERLESS = {
  top: "",
  "top-mid": "",
  "top-left": "",
  "top-right": "",
  bottom: "",
  "bottom-mid": "",
  "bottom-left": "",
  "bottom-right": "",
  left: "",
  "left-mid": "",
  mid: "",
  "mid-mid": "",
  right: "",
  "right-mid": "",
  middle: "  ",
} as const;

export function renderTable(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  const table = new Table({
    chars: BORDERLESS,
    style: { border: [], head: [], "padding-left": 0, "padding-right": 0 },
  });
  for (const row of rows) {
    table.push([...row]);
  }
  return table
    .toString()
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n");
}
