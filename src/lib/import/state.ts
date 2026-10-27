import type { InboxRecord, InvalidRow, PreviewRow, RawRow, ValidMessage } from "../domain/types";
import { applyOutcome, toQueuedRecords, type ProcessOutcome } from "../processing/processor";
import { validate } from "./validate";

// Import screen state (prototype: importMode/preview/valid/invalid/records/processing). Pure transitions.
export type ImportState = {
  mode: "empty" | "preview" | "parse-error";
  fileName: string;
  preview: PreviewRow[];
  valid: ValidMessage[];
  invalid: InvalidRow[];
  parseError: string;
  records: InboxRecord[];
  processing: boolean;
  importSeq: number; // increments per import → unique internal keys across repeated imports
};

export const initialImportState: ImportState = {
  mode: "empty", fileName: "", preview: [], valid: [], invalid: [], parseError: "", records: [], processing: false, importSeq: 0,
};

export function applyImport(s: ImportState, rows: readonly RawRow[], fileName: string): ImportState {
  const importSeq = s.importSeq + 1;
  const { valid, invalid, preview } = validate([...rows], `b${importSeq}`);
  return { ...s, mode: "preview", fileName, preview, valid, invalid, parseError: "", records: [], processing: false, importSeq };
}

// Prototype behavior: a file-level error replaces the preview with the error notice. Prior valid rows are kept in
// state (not processed) until the next successful import replaces them.
export function applyParseError(s: ImportState, message: string): ImportState {
  return { ...s, mode: "parse-error", parseError: message };
}

export function beginProcessing(s: ImportState): ImportState {
  if (!s.valid.length) return s;
  return { ...s, processing: true, records: toQueuedRecords(s.valid) };
}

export function cancelProcessing(s: ImportState): ImportState {
  return { ...s, processing: false, records: [] };
}

// Queued → processing for every queued record (the batch has been handed to the processor).
export function markProcessing(s: ImportState): ImportState {
  return { ...s, records: s.records.map((r) => (r.processing === "queued" ? { ...r, processing: "processing" } : r)) };
}

// Processor outcomes → completed/failed records; the processing view closes. Records without an outcome stay as they are.
export function applyOutcomes(s: ImportState, outcomes: readonly ProcessOutcome[]): ImportState {
  const byKey = new Map(outcomes.map((o) => [o.key, o]));
  return { ...s, processing: false, records: s.records.map((r) => (byKey.has(r.key) ? applyOutcome(r, byKey.get(r.key)!) : r)) };
}
