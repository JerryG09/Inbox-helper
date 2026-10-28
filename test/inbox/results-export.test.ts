import { describe, expect, it } from "vitest";
import { approveDraft, correctPrimary, editDraft, recheckDraft, rejectDraft, toggleSecondary, updateRecord } from "@/lib/domain/transitions";
import type { InboxRecord, RawRow } from "@/lib/domain/types";
import { csvQuote, EXPORT_COLUMNS, EXPORT_FILENAME, EXPORT_MEDIA_TYPE, exportCsv } from "@/lib/export/export-csv";
import { INVALID_SAMPLE_ROWS, SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, beginProcessing, initialImportState, settleOperation, startOperation, type ImportState } from "@/lib/import/state";
import { stats } from "@/lib/inbox/inbox";
import { controlledAdapter, simulateBatch, simulateOutcome, simulateRetry, simulateRetryOutcome } from "@/lib/processing/mock";
import type { ProcessBatch } from "@/lib/processing/processor";
import { attentionState, historicalFinding, historyLabel } from "@/lib/results/results";

// Independent RFC 4180 reader (not the app's parser): quoted fields, "" escapes, CRLF records, embedded newlines.
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", i = 0, quoted = false;
  while (i < text.length) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ",") { row.push(cell); cell = ""; i++; continue; }
    if (c === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i += 2; continue; }
    if (c === "\n" || c === "\r") throw new Error(`bare line break outside quotes at ${i}`);
    cell += c; i++;
  }
  row.push(cell); rows.push(row);
  return rows;
}
const asObjects = (csv: string) => {
  const [head, ...rows] = readCsv(csv);
  return rows.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i]])) as Record<(typeof EXPORT_COLUMNS)[number], string>);
};

async function run(s: ImportState, kind: "batch" | "retry", keys: readonly string[], adapter: ProcessBatch) {
  const { state, op } = startOperation(s, kind, keys);
  if (!op) return state;
  return settleOperation(state, op.id, await adapter(state.valid.filter((m) => op.keys.includes(m.key))));
}
async function revealed(rows: readonly RawRow[] = SAMPLE_ROWS, adapter: ProcessBatch = simulateBatch) {
  const q = beginProcessing(applyImport(initialImportState, rows, "x"));
  return run(q, "batch", q.records.map((r) => r.key), adapter);
}
const id = (s: ImportState | readonly InboxRecord[], importedId: string) => ("records" in s ? s.records : s).find((r) => r.importedId === importedId)!;
const edit = (s: ImportState, importedId: string, fn: (r: InboxRecord) => InboxRecord): ImportState => ({ ...s, records: updateRecord(s.records, id(s, importedId).key, fn) });
function reconciles(rs: readonly InboxRecord[]) {
  const s = stats(rs);
  expect(s.total).toBe(s.queued + s.processing + s.completed + s.failed);
  expect(s.completed).toBe(s.pending + s.approved + s.rejected);
}
const SAFE = "Hi Sarah, we will ask the recruitment team for an update.";

describe("Results selectors and counts", () => {
  it("1. empty batch: no rows, zero counts, header-only CSV", () => {
    expect(stats([])).toMatchObject({ total: 0, completed: 0, failed: 0 });
    expect(exportCsv([])).toBe(EXPORT_COLUMNS.join(","));
  });

  it("2/10. six-message sample: five Completed, one Failed; every record exactly once in batch order", async () => {
    const d = await revealed();
    expect(stats(d.records)).toMatchObject({ total: 6, completed: 5, failed: 1, pending: 5, queued: 0, processing: 0 });
    const rows = asObjects(exportCsv(d.records));
    expect(rows.map((r) => r.id)).toEqual(["M001", "M002", "M003", "M004", "M005", "M006"]);
    expect(rows.map((r) => r.processing_status)).toEqual(["Completed", "Completed", "Completed", "Completed", "Failed", "Completed"]);
    reconciles(d.records);
  });

  it("3/4. a batch holding all four processing categories reconciles", async () => {
    const d = await revealed();
    const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS.slice(0, 2), "y")).records; // queued
    const inFlight = startOperation(d, "retry", [id(d, "M005").key]).state.records; // processing
    const mixed = [...inFlight, ...q];
    expect(stats(mixed)).toMatchObject({ total: 8, queued: 2, processing: 1, completed: 5, failed: 0 });
    reconciles(mixed);
    const rows = asObjects(exportCsv(mixed));
    expect(rows.map((r) => r.processing_status)).toEqual(["Completed", "Completed", "Completed", "Completed", "Processing", "Completed", "Queued", "Queued"]);
    expect(rows.filter((r) => r.processing_status !== "Completed").every((r) => r.current_attention_state === "N/A" && r.review_status === "")).toBe(true);
  });

  it("5. Pending/Approved/Rejected counts; 6/7. editing an Approved or Rejected draft resets it to Pending", async () => {
    let d = await revealed();
    d = edit(d, "M001", approveDraft);
    d = edit(d, "M002", rejectDraft);
    expect(stats(d.records)).toMatchObject({ pending: 3, approved: 1, rejected: 1 });
    reconciles(d.records);
    d = edit(d, "M001", (r) => editDraft(r, "Hi Ada, edited after approval."));
    d = edit(d, "M002", (r) => editDraft(r, "Hi David, edited after rejection."));
    expect(stats(d.records)).toMatchObject({ pending: 5, approved: 0, rejected: 0 });
    const rows = asObjects(exportCsv(d.records));
    expect(rows[0]).toMatchObject({ review_status: "Pending", reviewed_draft: "Hi Ada, edited after approval." });
    expect(rows[1]).toMatchObject({ review_status: "Pending", reviewed_draft: "Hi David, edited after rejection." });
    reconciles(d.records);
  });

  it("8. a failed-only retry updates Results; 9. a failed retry stays visible as Failed", async () => {
    const d = await revealed();
    const ok = await run(d, "retry", [id(d, "M005").key], simulateRetry);
    expect(stats(ok.records)).toMatchObject({ completed: 6, failed: 0, pending: 6 });
    expect(asObjects(exportCsv(ok.records))[4]).toMatchObject({ id: "M005", processing_status: "Completed", review_status: "Pending", primary_intent: "Documentation / technical", processing_error: "" });
    const bad = await run(d, "retry", [id(d, "M005").key], controlledAdapter(simulateRetryOutcome, { [id(d, "M005").key]: ["fail"] }));
    expect(asObjects(exportCsv(bad.records))[4]).toMatchObject({ id: "M005", processing_status: "Failed", review_status: "", processing_error: "Simulated AI provider timeout" });
    reconciles(ok.records); reconciles(bad.records);
  });
});

describe("current attention versus history (14)", () => {
  it("M003 blocker: Blocked → corrected pending → approved / rejected, history always retained", async () => {
    let d = await revealed();
    const at = () => [attentionState(id(d, "M003")), historyLabel(id(d, "M003")), historicalFinding(id(d, "M003"))];
    expect(at()).toEqual(["Blocked", "Original AI claim unresolved", "Initial AI output asserted unsupported hiring decision"]);
    d = edit(d, "M003", (r) => editDraft(r, SAFE));
    expect(at()[0]).toBe("Blocked"); // an edit alone never clears the blocker
    d = edit(d, "M003", (r) => recheckDraft(r).record);
    expect(at()).toEqual(["Corrected — pending review", "Initial AI claim corrected", "Initial AI output asserted unsupported hiring decision"]);
    const approved = edit(d, "M003", approveDraft);
    expect(attentionState(id(approved, "M003"))).toBe("Corrected — approved after review");
    const rejected = edit(d, "M003", rejectDraft);
    expect(attentionState(id(rejected, "M003"))).toBe("Corrected — rejected draft");
    const row = asObjects(exportCsv(approved.records))[2]!;
    expect(row).toMatchObject({
      current_attention_state: "Corrected — approved after review", current_attention_reasons: "",
      historical_ai_findings: "Initial AI output asserted unsupported hiring decision",
      original_ai_draft: "Congratulations! You have been hired and your offer letter is being prepared.", reviewed_draft: SAFE,
    });
    // Reintroducing the unsafe phrase re-blocks the current state; history is unchanged.
    const re = edit(approved, "M003", (r) => editDraft(r, SAFE + " You are hired."));
    expect([attentionState(id(re, "M003")), id(re, "M003").review]).toEqual(["Blocked", "pending"]);
  });

  it("warnings are current attention and also historical findings; a plain record is None", async () => {
    const d = await revealed();
    const rows = asObjects(exportCsv(d.records));
    expect(rows[1]).toMatchObject({ current_attention_state: "Needs attention", current_attention_reasons: "Multiple requests | Interview availability not verified", historical_ai_findings: "Multiple requests | Interview availability not verified" });
    expect(rows[3]).toMatchObject({ current_attention_state: "None", current_attention_reasons: "", historical_ai_findings: "" });
    expect(rows[4]).toMatchObject({ current_attention_state: "N/A", historical_ai_findings: "" });
  });
});

describe("CSV export", () => {
  it("16. exact 14 columns in the approved order; filename and media type", () => {
    expect(exportCsv([]).split("\r\n")[0]).toBe(
      "id,candidate_name,subject,message,processing_status,review_status,primary_intent,secondary_intents,current_attention_state,current_attention_reasons,historical_ai_findings,original_ai_draft,reviewed_draft,processing_error",
    );
    expect(EXPORT_FILENAME).toBe("candidate-inbox-demo-results-v1-1.csv");
    expect(EXPORT_MEDIA_TYPE).toBe("text/csv;charset=utf-8");
  });

  it("11/12/13/15. imported id and original message, original AI draft after edit, corrected intents; Failed, Pending, Rejected included", async () => {
    let d = await revealed();
    d = edit(d, "M001", (r) => approveDraft(editDraft(r, "Hi Ada, human edit.")));
    d = edit(d, "M002", (r) => rejectDraft(toggleSecondary(correctPrimary(r, "documentation_technical"), "job_information", true)));
    const rows = asObjects(exportCsv(d.records));
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({
      id: "M001", candidate_name: "Ada Okafor", subject: "Interview change", message: SAMPLE_ROWS[0]!.message,
      processing_status: "Completed", review_status: "Approved", primary_intent: "Interview scheduling", secondary_intents: "",
      current_attention_state: "Needs attention", current_attention_reasons: "Interview availability not verified",
      historical_ai_findings: "Interview availability not verified",
      original_ai_draft: "Hi Ada, thanks for letting us know. Could you share some alternative times? We will check availability and get back to you.",
      reviewed_draft: "Hi Ada, human edit.", processing_error: "",
    });
    expect(rows[1]).toMatchObject({ review_status: "Rejected", primary_intent: "Documentation / technical", secondary_intents: "Interview scheduling | Job information" });
    expect(rows.map((r) => r.review_status)).toEqual(["Approved", "Rejected", "Pending", "Pending", "", "Pending"]);
    expect(rows[4]).toMatchObject({ id: "M005", processing_status: "Failed", primary_intent: "", original_ai_draft: "", reviewed_draft: "", processing_error: "Simulated AI provider timeout" });
  });

  it("uses the imported id, never the internal key", async () => {
    const d = await revealed();
    const csv = exportCsv(d.records);
    expect(csv).not.toMatch(/b\d+:r\d+/);
    expect(asObjects(csv).map((r) => [r.id, r.message])).toEqual(SAMPLE_ROWS.map((r) => [r.id, r.message]));
  });

  it("invalid import rows are never exported", async () => {
    const d = await revealed(INVALID_SAMPLE_ROWS);
    const rows = asObjects(exportCsv(d.records));
    expect(rows).toHaveLength(d.valid.length);
    expect(d.invalid.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(INVALID_SAMPLE_ROWS.length);
  });

  it("17. commas, quotes and multiline fields round-trip exactly with CRLF record separators", async () => {
    const message = 'Hello, "team".\nLine two, with a comma\r\nLine three ""double""';
    const d = await revealed([{ id: "X1", candidate_name: 'O"Neil, Pat', subject: "a,b", message }]);
    const csv = exportCsv(d.records);
    const rows = readCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.length === 14)).toBe(true);
    expect(rows[1]!.slice(0, 4)).toEqual(["X1", 'O"Neil, Pat', "a,b", message]);
    expect(csv.split("\r\n")[0]).toBe(EXPORT_COLUMNS.join(","));
  });

  it("19. serialization does not mutate source records", async () => {
    const d = await revealed();
    const frozen = structuredClone(d.records);
    const deep = (o: unknown): unknown => (o && typeof o === "object" ? Object.freeze(Object.values(o).forEach(deep) ?? o) : o);
    d.records.forEach(deep);
    expect(() => exportCsv(d.records)).not.toThrow();
    expect(d.records).toEqual(frozen);
  });

  it("20. no internal keys, operation diagnostics, provider names or credentials appear in the export", async () => {
    const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS, "x"));
    const d = await run(q, "batch", q.records.map((r) => r.key), controlledAdapter(simulateOutcome, { [q.records[0]!.key]: ["duplicate"] }));
    expect(d.diagnostics.length).toBeGreaterThan(0);
    const csv = exportCsv(d.records);
    for (const bad of [/b\d+:r\d+/, /opId|stale_result|unexpected_outcome|duplicate_outcome|missing_outcome/, /anthropic|api[_-]?key|sk-ant|secret|token/i, /simulated_fixture|simulated_fallback/]) expect(csv).not.toMatch(bad);
    expect(asObjects(csv)[0]!.processing_error).toBe("Processing returned conflicting results for this message");
  });
});

describe("18. spreadsheet formula-injection guard", () => {
  // Independent expectation: a decoded cell must never start (after leading control chars/whitespace/BOM) with = + - @.
  const executable = (cell: string) => /^[\u0000- ﻿]*[=+\-@]/.test(cell);
  const ATTACKS = [
    '=HYPERLINK("https://example.test","Click")', "+SUM(1,2)", "-1+2", "@SUM(A1:A2)",
    " =1+1", "   +SUM(1,2)", "\t=1+1", "\t\t@SUM(A1)", "\r=1+1", "\n-2+3", "\r\n=CMD|' /C calc'!A0",
    "\u0000=1", "\u001f@x", "﻿=1+1", "﻿ \t=1", '"=1+1', '""=1', "=1,2\n=3",
  ];

  it.each(ATTACKS)("csvQuote neutralizes %j and the decoded cell keeps the original text after the apostrophe", (attack) => {
    const q = csvQuote(attack);
    const [[cell]] = readCsv(q) as [[string]];
    if (executable(attack)) {
      expect(cell).toBe("'" + attack);
      expect(cell.startsWith("'")).toBe(true);
    } else {
      // A leading quote character is data, not a trigger, and the decoded cell starts with that quote.
      expect(cell).toBe(attack);
      expect(executable(cell)).toBe(false);
    }
  });

  it("benign values are unchanged (no false apostrophes)", () => {
    for (const v of ["Hello", "M001", "a=b", "1-2", "e-mail@example.test", "", "Interview scheduling"]) expect(readCsv(csvQuote(v))[0]![0]).toBe(v);
  });

  it("formula-like text in ANY exported field is neutralized end-to-end", async () => {
    const atk = (s: string) => `=HYPERLINK("https://example.test","${s}")`;
    // Import trims fields and restricts ids to [A-Za-z0-9_-], so "-1" is the only formula-capable id shape.
    const d0 = await revealed([{ id: "-1", candidate_name: "+SUM(1,2)", subject: " @SUM(A1:A2)", message: "\t=HYPERLINK(\"https://example.test\",\"x\")" }]);
    // A human edit is NOT trimmed: whitespace-prefixed payload in reviewed_draft.
    const d = edit(d0, "-1", (r) => editDraft(r, "\t " + atk("draft")));
    const csv = exportCsv(d.records);
    const [head, row] = readCsv(csv) as [string[], string[]];
    expect(row).toHaveLength(14);
    for (const cell of row) expect(executable(cell)).toBe(false);
    const o = Object.fromEntries(head.map((h, i) => [h, row[i]]));
    expect(o).toMatchObject({ id: "'-1", candidate_name: "'+SUM(1,2)", subject: "'@SUM(A1:A2)", message: "'=HYPERLINK(\"https://example.test\",\"x\")", reviewed_draft: "'\t " + atk("draft") });
    expect(id(d, "-1").currentDraft).toBe("\t " + atk("draft")); // the app value is untouched
  });

  it("mutation-sensitive: removing the whitespace/control prefix from the guard would leave executable cells", () => {
    const weak = (v: string) => (/^[=+\-@]/.test(v) ? "'" + v : v);
    expect(ATTACKS.filter((a) => executable(a) && executable(weak(a))).length).toBeGreaterThan(0);
    expect(ATTACKS.filter((a) => executable(readCsv(csvQuote(a))[0]![0]!))).toEqual([]);
  });
});
