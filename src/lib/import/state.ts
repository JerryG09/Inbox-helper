import type { InboxRecord, InvalidRow, PreviewRow, RawRow, ValidMessage } from "../domain/types";
import { appendDiagnostics, failAll, reconcile, type Diagnostic, type Operation, type OperationKind } from "../processing/operation";
import { toQueuedRecords, type ProcessOutcome } from "../processing/processor";
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
  opSeq: number; // increments per processing operation; never reused, survives reset (stale-result guard, I5)
  activeOp: Operation | null; // at most one operation in flight; overlapping starts are refused
  diagnostics: Diagnostic[]; // bounded, content-free processing diagnostics
};

export const initialImportState: ImportState = {
  mode: "empty", fileName: "", preview: [], valid: [], invalid: [], parseError: "", records: [], processing: false, importSeq: 0,
  opSeq: 0, activeOp: null, diagnostics: [],
};

export function applyImport(s: ImportState, rows: readonly RawRow[], fileName: string): ImportState {
  const importSeq = s.importSeq + 1;
  const { valid, invalid, preview } = validate([...rows], `b${importSeq}`);
  return { ...s, mode: "preview", fileName, preview, valid, invalid, parseError: "", records: [], processing: false, importSeq, activeOp: null };
}

// Prototype behavior: a file-level error replaces the preview with the error notice. Prior valid rows are kept in
// state (not processed) until the next successful import replaces them.
export function applyParseError(s: ImportState, message: string): ImportState {
  return { ...s, mode: "parse-error", parseError: message };
}

export function beginProcessing(s: ImportState): ImportState {
  if (!s.valid.length) return s;
  return { ...s, processing: true, records: toQueuedRecords(s.valid), activeOp: null };
}

export function cancelProcessing(s: ImportState): ImportState {
  return { ...s, processing: false, records: [], activeOp: null };
}

// Reset discards the batch and any in-flight operation; counters are kept so keys and operation ids are never reused.
export function resetState(s: ImportState): ImportState {
  return { ...initialImportState, importSeq: s.importSeq, opSeq: s.opSeq, diagnostics: s.diagnostics };
}

// Start an operation over an immutable snapshot of target keys (I1). A batch targets Queued records; a retry targets
// Failed records only (never Completed/Approved/Rejected). Refused (op: null) while another operation is in flight.
export function startOperation(s: ImportState, kind: OperationKind, keys: readonly string[]): { state: ImportState; op: Operation | null } {
  if (s.activeOp) return { state: s, op: null };
  const eligible = kind === "batch" ? "queued" : "failed";
  const wanted = new Set(keys);
  const targets = s.records.filter((r) => wanted.has(r.key) && r.processing === eligible).map((r) => r.key);
  if (!targets.length) return { state: s, op: null };
  const op: Operation = { id: s.opSeq + 1, kind, keys: Object.freeze(targets) };
  const set = new Set(targets);
  const records = s.records.map((r) => (set.has(r.key) ? { ...r, processing: "processing" as const, error: undefined } : r));
  return { state: { ...s, records, opSeq: op.id, activeOp: op }, op };
}

// I5: a result for anything but the current active operation (reset, new import, superseded or already settled)
// mutates no record; only a content-free diagnostic is kept.
function settleWith(s: ImportState, opId: number, settle: (op: Operation) => { records: ImportState["records"]; diagnostics: Diagnostic[] }): ImportState {
  const op = s.activeOp;
  if (!op || op.id !== opId) return { ...s, diagnostics: appendDiagnostics(s.diagnostics, [{ opId, code: "stale_result", count: 1 }]) };
  const { records, diagnostics } = settle(op);
  return { ...s, records, activeOp: null, processing: op.kind === "batch" ? false : s.processing, diagnostics: appendDiagnostics(s.diagnostics, diagnostics) };
}

export const settleOperation = (s: ImportState, opId: number, outcomes: readonly ProcessOutcome[]) =>
  settleWith(s, opId, (op) => reconcile(s.records, op, outcomes));

export const failOperation = (s: ImportState, opId: number) => settleWith(s, opId, (op) => failAll(s.records, op));

// Queued → processing for every queued record (the batch has been handed to the processor).
export function markProcessing(s: ImportState): ImportState {
  return startOperation(s, "batch", s.records.map((r) => r.key)).state;
}

// Processor outcomes → completed/failed records; the processing view closes. Every handed-off record settles (I2).
export function applyOutcomes(s: ImportState, outcomes: readonly ProcessOutcome[]): ImportState {
  const started = s.activeOp ? s : markProcessing(s);
  return started.activeOp ? settleOperation(started, started.activeOp.id, outcomes) : { ...s, processing: false };
}
