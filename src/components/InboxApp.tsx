"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RuntimeModeProvider } from "@/components/RuntimeMode";
import { ImportWorkspace } from "@/components/ImportWorkspace";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { ResultsWorkspace } from "@/components/ResultsWorkspace";
import type { IntentId } from "@/lib/domain/intents";
import { approveDraft, canApprove, correctPrimary, editDraft, hadBlocker, recheckDraft, rejectDraft, toggleSecondary, updateRecord } from "@/lib/domain/transitions";
import type { InboxRecord, RawRow } from "@/lib/domain/types";
import type { View } from "@/lib/domain/views";
import { CsvParseError, parseCSV } from "@/lib/import/parse-csv";
import { INVALID_SAMPLE_NAME, INVALID_SAMPLE_ROWS, SAMPLE_NAME, SAMPLE_ROWS } from "@/lib/import/sample";
import {
  applyImport, applyParseError, beginProcessing, cancelProcessing, failOperation, initialImportState, resetState, settleOperation, startOperation,
  type ImportState,
} from "@/lib/import/state";
import { MAX_FILE_BYTES } from "@/lib/import/validate";
import {
  clearFilters, initialInboxView, intentLabel, nextPending, normalizeView, selectRecord, setAttentionOnly, setProcessFilter,
  setReviewFilter, showFailedQueue, viewAfterReveal, type InboxView,
} from "@/lib/inbox/inbox";
import { downloadCsv } from "@/lib/export/export-csv";
import { liveAdapters } from "@/lib/processing/live-client";
import type { RuntimeMode } from "@/lib/processing/live-contract";
import { simulationAdapters } from "@/lib/processing/mock";
import type { OperationKind } from "@/lib/processing/operation";
import type { ProcessBatch } from "@/lib/processing/processor";

// Adapter choice follows the server-resolved mode (AI-01). Only simulated mode ever reads the window.__MUST_SIM_PLAN__
// test hook; live and unavailable modes always go to the server route, which alone decides whether a model is called.
let simAdapters: ReturnType<typeof simulationAdapters> | undefined;
let live: ReturnType<typeof liveAdapters> | undefined;
const getAdapters = (mode: RuntimeMode) => (mode.kind === "simulated" ? (simAdapters ??= simulationAdapters()) : (live ??= liveAdapters()));

// One-screen state machine (contract §4).
export function InboxApp({ mode }: { mode: RuntimeMode }) {
  const isLive = mode.kind !== "simulated";
  const [view, setView] = useState<View>("import");
  const [importState, setImportStateRaw] = useState<ImportState>(initialImportState);
  const [formKey, setFormKey] = useState(0);
  const [inboxView, setInboxViewRaw] = useState<InboxView>(initialInboxView);
  const [editedKey, setEditedKey] = useState<string | null>(null);
  const records = importState.records;
  // Current state for event handlers and async settlement (I5): never a stale render-closure snapshot.
  const stateRef = useRef(importState);
  const viewRef = useRef(inboxView);

  const announce = (message: string) => {
    const el = document.getElementById("globalLive");
    if (el) el.textContent = message;
  };

  const commit = (next: ImportState, rerenderForm: boolean) => {
    stateRef.current = next;
    setImportStateRaw(next);
    if (rerenderForm) setFormKey((k) => k + 1);
  };
  const setImportState = (next: (s: ImportState) => ImportState) => commit(next(stateRef.current), true);
  const putView = (v: InboxView) => {
    viewRef.current = v;
    setInboxViewRaw(v);
  };

  // Like the prototype's renderInbox(), a selection hidden by the filters moves to the first visible record.
  // Any full re-render in the prototype drops the transient "draft edited" display, so every view change clears it.
  const setInboxView = (v: InboxView, rs: readonly InboxRecord[] = stateRef.current.records) => {
    setEditedKey(null);
    putView(normalizeView(rs, v));
  };

  // Record edits only touch the inbox; the Import form is not re-rendered (prototype renders the visible view only).
  const setRecords = (next: InboxRecord[]) => commit({ ...stateRef.current, records: next }, false);
  const mutate = (key: string, fn: (r: InboxRecord) => InboxRecord) => updateRecord(stateRef.current.records, key, fn);
  const find = (key: string) => stateRef.current.records.find((x) => x.key === key);
  const reviewFilterAfterEdit = (v: InboxView): InboxView =>
    v.reviewFilter === "Approved" || v.reviewFilter === "Rejected" ? { ...v, reviewFilter: "Pending" } : v;
  const focusFirstVisible = (selectors: string[]) => setTimeout(() => {
    const el = selectors.map((q) => document.querySelector<HTMLElement>(q)).find((e) => e && e.offsetParent !== null);
    el?.focus({ preventScroll: true });
  }, 0);
  const focusLater = (selector: string) => setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 0);

  const onPrimary = (key: string, intent: IntentId) => {
    const r = find(key);
    if (!r || r.primaryIntent === intent) return;
    const next = mutate(key, (x) => correctPrimary(x, intent));
    setRecords(next);
    setInboxView(reviewFilterAfterEdit(viewRef.current), next);
    focusLater("#primaryIntent");
    announce("Primary intent changed. Previous primary retained as secondary when swapping. Review reset to pending.");
  };

  const onSecondary = (key: string, intent: IntentId, checked: boolean) => {
    const next = mutate(key, (x) => toggleSecondary(x, intent, checked));
    setRecords(next);
    setInboxView(reviewFilterAfterEdit(viewRef.current), next);
    focusLater(`.secondary-options input[value="${CSS.escape(intentLabel(intent))}"]`);
    announce("Secondary intentions updated. Review pending.");
  };

  // Keystroke path: like the prototype's draftChanged(), update state without moving the selection or the editor.
  const onDraft = (key: string, text: string) => {
    setRecords(mutate(key, (x) => editDraft(x, text)));
    // Keep the selection fixed while typing (prototype draftChanged()); the edited record stays visible as Pending.
    putView(reviewFilterAfterEdit(viewRef.current));
    setEditedKey(key);
  };

  const onRecheck = (key: string) => {
    const r = find(key);
    if (!r || !hadBlocker(r)) return;
    const { record, passed } = recheckDraft(r);
    if (!passed) {
      announce(isLive ? "Limited phrase check still finds a known unsupported phrase. Human review required." : "Mock check still finds a known unsupported phrase. Human review required.");
      window.alert(isLive ? "Blocker remains. This limited phrase check cannot prove a response is safe; revise and inspect manually." : "Mock blocker remains. This limited phrase check cannot prove a response is safe; revise and inspect manually.");
      return;
    }
    const next = mutate(key, () => record);
    setRecords(next);
    setInboxView(viewRef.current, next);
    announce(isLive ? "Limited phrase check found no listed phrase. Original AI finding preserved; a human must still verify the reply." : "Limited mock check found no listed phrase. Original AI finding preserved; a human must still verify the reply.");
  };

  // After a decision under the Pending filter, move to another Pending record (prototype approve()/reject()).
  const decide = (key: string, fn: (r: InboxRecord) => InboxRecord) => {
    const next = mutate(key, fn);
    const remaining = next.find((x) => x.key !== key && x.processing === "completed" && x.review === "pending");
    const v = viewRef.current;
    setRecords(next);
    setInboxView(remaining && v.reviewFilter === "Pending" ? { ...v, selectedKey: remaining.key } : v, next);
  };
  const onApprove = (key: string) => {
    const r = find(key);
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
    if (stateRef.current.records.length && !window.confirm("A new import will replace this in-memory batch and its reviews. Export your current results before continuing. Continue?")) return;
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

  // One processing operation over an immutable snapshot of target keys. Settlement reads the CURRENT state, so a
  // result from a reset, replaced or superseded operation is dropped (I5); an adapter exception settles every target (I6).
  const runOperation = async (kind: OperationKind, keys: readonly string[], adapter: ProcessBatch) => {
    const { state, op } = startOperation(stateRef.current, kind, keys, isLive);
    if (!op) return null; // nothing eligible, or another operation is already in flight
    commit(state, kind === "batch");
    const targets = new Set(op.keys);
    const messages = state.valid.filter((m) => targets.has(m.key));
    let settle: (s: ImportState) => ImportState;
    try {
      const outcomes = await adapter(messages);
      settle = (s) => settleOperation(s, op.id, outcomes);
    } catch {
      settle = (s) => failOperation(s, op.id);
    }
    const stale = stateRef.current.activeOp?.id !== op.id;
    commit(settle(stateRef.current), kind === "batch" && !stale);
    return stale ? null : op;
  };

  const revealResults = async () => {
    const queued = stateRef.current.records.filter((r) => r.processing === "queued").map((r) => r.key);
    if (!(await runOperation("batch", queued, getAdapters(mode).batch))) return;
    const done = stateRef.current.records;
    setInboxView(viewAfterReveal(done), done);
    navigate("inbox");
  };

  // Failed-only retry (prototype retryOne()/retryFailed()). Targets are the records Failed when the action begins;
  // every other record is returned as the same object. A successful recovery is selected under Pending, as in V1.1.
  const retry = async (keys: readonly string[]) => {
    // UX-AI-02: a retried record leaves the Failed filter while Processing; announce the start so progress is never silent.
    const eligible = keys.filter((k) => find(k)?.processing === "failed").length;
    if (eligible && !stateRef.current.activeOp) announce(`Retrying ${eligible} failed message${eligible === 1 ? "" : "s"}. Processing…`);
    const op = await runOperation("retry", keys, getAdapters(mode).retry);
    if (!op) return;
    const now = stateRef.current.records;
    const settled = op.keys.map((k) => now.find((r) => r.key === k)).filter((r): r is InboxRecord => Boolean(r));
    const recovered = settled.filter((r) => r.processing === "completed");
    const stillFailed = settled.length - recovered.length;
    const v = viewRef.current;
    setInboxView(recovered.length ? { ...v, selectedKey: recovered[0]!.key, processFilter: "All", reviewFilter: "Pending" } : v, now);
    if (op.keys.length === 1) {
      announce(recovered.length
        ? `Retry succeeded. Message classified as ${intentLabel(recovered[0]!.primaryIntent!)}; review pending. Other messages unchanged.`
        : "Retry failed. The message remains in the Failed queue; other messages unchanged.");
    } else {
      announce(`Retried ${op.keys.length} failed messages: ${recovered.length} recovered, ${stillFailed} still failed. Other messages unchanged.`);
    }
    // The clicked control disappears or is disabled; move focus to the nearest visible equivalent.
    focusFirstVisible(recovered.length ? [".rightpane .mobile-return button", ".message.active"] : ["#retryOne", ".message.active"]);
  };

  const reset = () => {
    if (!window.confirm(isLive ? "Reset the workspace? This will discard all local reviews in this browser." : "Reset the hi-fi prototype? This will discard all local simulated reviews.")) return;
    setImportState(resetState);
    putView(initialInboxView);
    navigate("import");
  };

  const onSelect = (key: string) => {
    setInboxView(selectRecord(viewRef.current, key));
    if (window.innerWidth <= 1000) setTimeout(() => document.querySelector(".rightpane")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const onNextPending = () => {
    const next = nextPending(stateRef.current.records, viewRef.current);
    if (next) setInboxView(next);
    else navigate("results");
  };

  return (
    <RuntimeModeProvider value={mode}>
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
          onProcessFilter={(v) => setInboxView(setProcessFilter(viewRef.current, v))}
          onReviewFilter={(v) => setInboxView(setReviewFilter(viewRef.current, v))}
          onAttentionOnly={(v) => setInboxView(setAttentionOnly(viewRef.current, v))}
          onClearFilters={() => setInboxView(clearFilters(viewRef.current))}
          onFailedQueue={() => setInboxView(showFailedQueue(viewRef.current))}
          onBackToList={() => setInboxView({ ...viewRef.current, mobileDetail: false })}
          onRetryOne={(key) => retry([key])}
          onRetryFailed={() => retry(stateRef.current.records.filter((r) => r.processing === "failed").map((r) => r.key))}
          onNextPending={onNextPending}
        />
      </section>
      <section id="results-view" className={view === "results" ? undefined : "hidden"}>
        <ResultsWorkspace
          records={records}
          onNavigate={navigate}
          onDownload={() => {
            downloadCsv(stateRef.current.records);
            announce("CSV download started. No draft was approved, rejected or sent.");
          }}
        />
      </section>
    </AppShell>
    </RuntimeModeProvider>
  );
}
