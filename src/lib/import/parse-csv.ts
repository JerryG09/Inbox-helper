import type { RawRow } from "../domain/types";

export class CsvParseError extends Error {}

// Port of parseCSV() from the approved V1.1 prototype: RFC-4180-style quotes, CRLF/LF, blank lines skipped,
// required `id` + `message` headers, optional `candidate_name` + `subject`. Whole-file problems throw;
// per-row problems (column count) are flagged for row-level validation so other rows survive.
export function parseCSV(text: string): RawRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let buf = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { buf += '"'; i++; } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(buf); buf = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(buf); buf = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else buf += c;
  }
  if (quoted) throw new CsvParseError("CSV has an unclosed quote.");
  row.push(buf);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) throw new CsvParseError("CSV is empty.");

  const headers = rows.shift()!.map((v) => v.trim().replace(/^﻿/, ""));
  for (const req of ["id", "message"]) if (!headers.includes(req)) throw new CsvParseError("Missing required column: " + req);
  const col = (r: string[], name: string) => (headers.includes(name) ? r[headers.indexOf(name)] ?? "" : "");
  return rows.map((r, i) => ({
    id: col(r, "id"),
    candidate_name: col(r, "candidate_name"),
    subject: col(r, "subject"),
    message: col(r, "message"),
    sourceRow: i + 2,
    columnMismatch: r.length !== headers.length,
  }));
}
