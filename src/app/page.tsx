"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportWorkspace } from "@/components/ImportWorkspace";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { ResultsWorkspace } from "@/components/ResultsWorkspace";
import type { InboxRecord, RawRow } from "@/lib/domain/types";
import type { View } from "@/lib/domain/views";
import { CsvParseError, parseCSV } from "@/lib/import/parse-csv";
import { INVALID_SAMPLE_NAME, INVALID_SAMPLE_ROWS, SAMPLE_NAME, SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyOutcomes, applyParseError, beginProcessing, cancelProcessing, initialImportState, markProcessing, type ImportState } from "@/lib/import/state";
import { MAX_FILE_BYTES } from "@/lib/import/validate";
import {
  clearFilters, filtered, initialInboxView, nextPending, resolveSelection, selectRecord, setAttentionOnly, setProcessFilter,
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
  const records = importState.records;

  const setImportState = (next: (s: ImportState) => ImportState) => {
    setImportStateRaw(next);
    setFormKey((k) => k + 1);
  };

  // Like the prototype's renderInbox(), a selection hidden by the filters moves to the first visible record.
  const setInboxView = (v: InboxView, rs: readonly InboxRecord[] = records) =>
    setInboxViewRaw({ ...v, selectedKey: resolveSelection(filtered(rs, v), v.selectedKey) });

  useEffect(() => {
    document.body.classList.toggle("mobile-review-open", view === "inbox" && inboxView.mobileDetail);
  }, [view, inboxView.mobileDetail]);

  const navigate = (next: View) => {
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
