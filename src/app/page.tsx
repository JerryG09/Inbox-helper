"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportWorkspace } from "@/components/ImportWorkspace";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { ResultsWorkspace } from "@/components/ResultsWorkspace";
import type { IntentId } from "@/lib/domain/intents";
import { approveDraft, canApprove, correctPrimary, editDraft, hadBlocker, recheckDraft, rejectDraft, toggleSecondary, updateRecord } from "@/lib/domain/transitions";
import type { InboxRecord, RawRow } from "@/lib/domain/types";
import type { View } from "@/lib/domain/views";
import { CsvParseError, parseCSV } from "@/lib/import/parse-csv";
import { INVALID_SAMPLE_NAME, INVALID_SAMPLE_ROWS, SAMPLE_NAME, SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyOutcomes, applyParseError, beginProcessing, cancelProcessing, initialImportState, markProcessing, type ImportState } from "@/lib/import/state";
import { MAX_FILE_BYTES } from "@/lib/import/validate";
import {
  clearFilters, filtered, initialInboxView, intentLabel, nextPending, resolveSelection, selectRecord, setAttentionOnly, setProcessFilter,
  setReviewFilter, showFailedQueue, viewAfterReveal, type InboxView,
} from "@/lib/inbox/inbox";
import { simulateBatch } from "@/lib/processing/mock";
import type { ProcessBatch } from "@/lib/processing/processor";

// The simulated processor is the only one wired in this slice; a real provider is separately authorized.
const processBatch: ProcessBatch = simulateBatch;

// One-screen state machine (contract §4).
export default function Page() {
  const [view, setView] = useState<View>("import");
  const [importState, setImportStateRaw] = useState<ImportState>(initialImportState);
  const [formKey, setFormKey] = useState(0);
  const [inboxView, setInboxViewRaw] = useState<InboxView>(initialInboxView);
  const [editedKey, setEditedKey] = useState<string | null>(null);
  const records = importState.records;

  const announce = (message: string) => {
    const el = document.getElementById("globalLive");
    if (el) el.textContent = message;
  };

  const setImportState = (next: (s: ImportState) => ImportState) => {
    setImportStateRaw(next);
    setFormKey((k) => k + 1);
  };

  // Like the prototype's renderInbox(), a selection hidden by the filters moves to the first visible record.
  // Any full re-render in the prototype drops the transient "draft edited" display, so every view change clears it.
  const setInboxView = (v: InboxView, rs: readonly InboxRecord[] = records) => {
    setEditedKey(null);
    setInboxViewRaw({ ...v, selectedKey: resolveSelection(filtered(rs, v), v.selectedKey) });
  };

  // Record edits only touch the inbox; the Import form is not re-rendered (prototype renders the visible view only).
  const setRecords = (next: InboxRecord[]) => setImportStateRaw((s) => ({ ...s, records: next }));
  const reviewFilterAfterEdit = (v: InboxView): InboxView =>
    v.reviewFilter === "Approved" || v.reviewFilter === "Rejected" ? { ...v, reviewFilter: "Pending" } : v;
  const focusLater = (selector: string) => setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 0);

  const onPrimary = (key: string, intent: IntentId) => {
    const r = records.find((x) => x.key === key);
    if (!r || r.primaryIntent === intent) return;
    const next = updateRecord(records, key, (x) => correctPrimary(x, intent));
    setRecords(next);
    setInboxView(reviewFilterAfterEdit(inboxView), next);
    focusLater("#primaryIntent");
    announce("Primary intent changed. Previous primary retained as secondary when swapping. Review reset to pending.");
  };

  const onSecondary = (key: string, intent: IntentId, checked: boolean) => {
    const next = updateRecord(records, key, (x) => toggleSecondary(x, intent, checked));
    setRecords(next);
    setInboxView(reviewFilterAfterEdit(inboxView), next);
    focusLater(`.secondary-options input[value="${CSS.escape(intentLabel(intent))}"]`);
    announce("Secondary intentions updated. Review pending.");
  };

  // Keystroke path: like the prototype's draftChanged(), update state without moving the selection or the editor.
  const onDraft = (key: string, text: string) => {
    setRecords(updateRecord(records, key, (x) => editDraft(x, text)));
    setInboxViewRaw(reviewFilterAfterEdit(inboxView));
    setEditedKey(key);
  };

  const onRecheck = (key: string) => {
    const r = records.find((x) => x.key === key);
    if (!r || !hadBlocker(r)) return;
    const { record, passed } = recheckDraft(r);
    if (!passed) {
      announce("Mock check still finds a known unsupported phrase. Human review required.");
      window.alert("Mock blocker remains. This limited phrase check cannot prove a response is safe; revise and inspect manually.");
      return;
    }
    const next = updateRecord(records, key, () => record);
    setRecords(next);
    setInboxView(inboxView, next);
    announce("Limited mock check found no listed phrase. Original AI finding preserved; a human must still verify the reply.");
  };

  // After a decision under the Pending filter, move to another Pending record (prototype approve()/reject()).
  const decide = (key: string, fn: (r: InboxRecord) => InboxRecord) => {
    const next = updateRecord(records, key, fn);
    const remaining = next.find((x) => x.key !== key && x.processing === "completed" && x.review === "pending");
    setRecords(next);
    setInboxView(remaining && inboxView.reviewFilter === "Pending" ? { ...inboxView, selectedKey: remaining.key } : inboxView, next);
  };
  const onApprove = (key: string) => {
    const r = records.find((x) => x.key === key);
    if (!r || !canApprove(r)) return;
    decide(key, approveDraft);
    announce("Draft approval recorded. No message was sent.");
  };
  const onReject = (key: string) => decide(key, rejectDraft);

  useEffect(() => {
    document.body.classList.toggle("mobile-review-open", view === "inbox" && inboxView.mobileDetail);
  }, [view, inboxView.mobileDetail]);

  const navigate = (next: View) => {
    setEditedKey(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const importRows = (rows: readonly RawRow[], name: string) => {
    if (records.length && !window.confirm("A new import will replace this in-memory batch and its reviews. Export your current results before continuing. Continue?")) return;
    setImportState((s) => applyImport(s, rows, name));
    navigate("import");
  };

  const parseError = (message: string) => {
    setImportState((s) => applyParseError(s, message));
    navigate("import");
  };

  const onFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) return parseError("CSV file exceeds the 256 KB prototype limit.");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importRows(parseCSV(String(reader.result || "")), file.name);
      } catch (err) {
        if (!(err instanceof CsvParseError)) throw err;
        parseError(err.message);
      }
    };
    reader.onerror = () => parseError("Could not read the selected CSV file.");
    reader.readAsText(file);
  };

  const revealResults = async () => {
    const queuedKeys = new Set(records.filter((r) => r.processing === "queued").map((r) => r.key));
    const handedOff = markProcessing(importState);
    setImportState(() => handedOff);
    const outcomes = await processBatch(importState.valid.filter((m) => queuedKeys.has(m.key)));
    const done = applyOutcomes(handedOff, outcomes);
    setImportState(() => done);
    setInboxView(viewAfterReveal(done.records), done.records);
    navigate("inbox");
  };

  const reset = () => {
    if (!window.confirm("Reset the hi-fi prototype? This will discard all local simulated reviews.")) return;
    setImportState(() => initialImportState);
    setInboxViewRaw(initialInboxView);
    navigate("import");
  };

  const onSelect = (key: string) => {
    setInboxView(selectRecord(inboxView, key));
    if (window.innerWidth <= 1000) setTimeout(() => document.querySelector(".rightpane")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const onNextPending = () => {
    const next = nextPending(records, inboxView);
    if (next) setInboxView(next);
    else navigate("results");
  };

  return (
    <AppShell view={view} onNavigate={navigate} onReset={reset}>
      <section id="import-view" className={view === "import" ? undefined : "hidden"}>
        <ImportWorkspace
          state={importState}
          formKey={formKey}
          onLoadSample={() => importRows(SAMPLE_ROWS, SAMPLE_NAME)}
          onLoadInvalidSample={() => importRows(INVALID_SAMPLE_ROWS, INVALID_SAMPLE_NAME)}
          onFile={onFile}
          onManual={(row) => importRows([row], "Manual entry")}
          onProcess={() => setImportState(beginProcessing)}
          onCancelProcessing={() => setImportState(cancelProcessing)}
          onRevealResults={revealResults}
        />
      </section>
      <section id="inbox-view" className={view === "inbox" ? undefined : "hidden"}>
        <InboxWorkspace
          records={records}
          view={inboxView}
          editedKey={editedKey}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          onDraft={onDraft}
          onRecheck={onRecheck}
          onApprove={onApprove}
          onReject={onReject}
          onNavigate={navigate}
          onSelect={onSelect}
          onProcessFilter={(v) => setInboxView(setProcessFilter(inboxView, v))}
          onReviewFilter={(v) => setInboxView(setReviewFilter(inboxView, v))}
          onAttentionOnly={(v) => setInboxView(setAttentionOnly(inboxView, v))}
          onClearFilters={() => setInboxView(clearFilters(inboxView))}
          onFailedQueue={() => setInboxView(showFailedQueue(inboxView))}
          onBackToList={() => setInboxView({ ...inboxView, mobileDetail: false })}
          onNextPending={onNextPending}
        />
      </section>
      <section id="results-view" className={view === "results" ? undefined : "hidden"}>
        <ResultsWorkspace onNavigate={navigate} />
      </section>
    </AppShell>
  );
}
