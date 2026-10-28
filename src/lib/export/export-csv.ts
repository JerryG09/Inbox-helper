// CSV export ported from exportText()/csvQuote()/downloadCSV() in the approved V1.1 prototype. Pure and read-only:
// serialization never mutates a record. Only validated batch records are exported (invalid rows never become records).
import type { InboxRecord } from "../domain/types";
import { intentLabel, PROCESSING_LABEL, REVIEW_LABEL } from "../inbox/inbox";
import { attentionState, historicalFinding } from "../results/results";

export const EXPORT_FILENAME = "candidate-inbox-demo-results-v1-1.csv";
export const EXPORT_MEDIA_TYPE = "text/csv;charset=utf-8";

export const EXPORT_COLUMNS = [
  "id", "candidate_name", "subject", "message", "processing_status", "review_status", "primary_intent", "secondary_intents",
  "current_attention_state", "current_attention_reasons", "historical_ai_findings", "original_ai_draft", "reviewed_draft", "processing_error",
] as const;

// Spreadsheet formula guard (prototype csvQuote()). A cell whose text, after any leading ASCII control characters,
// spaces, CR/LF/tab or BOM, starts with = + - @ is prefixed with a literal apostrophe so spreadsheet apps treat it as
// text. The guard runs on the RAW value before quoting, so quote escaping can never hide or create a leading trigger.
const FORMULA_TRIGGER = /^[\u0000- ﻿]*[=+\-@]/;

export function csvQuote(v: string | undefined | null): string {
  const raw = String(v ?? "");
  const guarded = FORMULA_TRIGGER.test(raw) ? "'" + raw : raw;
  return '"' + guarded.replace(/"/g, '""') + '"';
}

export function exportRow(r: InboxRecord): string[] {
  return [
    r.importedId,
    r.candidateName ?? "",
    r.subject ?? "",
    r.message,
    PROCESSING_LABEL[r.processing],
    r.review ? REVIEW_LABEL[r.review] : "",
    r.primaryIntent ? intentLabel(r.primaryIntent) : "",
    r.secondaryIntents.map(intentLabel).join(" | "),
    attentionState(r),
    r.currentAttentionReasons.join(" | "),
    historicalFinding(r),
    r.originalAiDraft ?? "",
    r.currentDraft ?? "",
    r.processing === "failed" ? r.error?.description ?? "" : "",
  ];
}

// Header row unquoted (as approved), every value quoted, CRLF between records, batch order preserved.
export function exportCsv(records: readonly InboxRecord[]): string {
  return [EXPORT_COLUMNS.join(","), ...records.map((r) => exportRow(r).map(csvQuote).join(","))].join("\r\n");
}

// Browser-native download; the object URL is revoked after the click has started the download.
export function downloadCsv(records: readonly InboxRecord[]) {
  const url = URL.createObjectURL(new Blob([exportCsv(records)], { type: EXPORT_MEDIA_TYPE }));
  const a = document.createElement("a");
  a.href = url;
  a.download = EXPORT_FILENAME;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
