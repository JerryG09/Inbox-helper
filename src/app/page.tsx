"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportWorkspace } from "@/components/ImportWorkspace";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { ResultsWorkspace } from "@/components/ResultsWorkspace";
import type { RawRow } from "@/lib/domain/types";
import { CsvParseError, parseCSV } from "@/lib/import/parse-csv";
import { INVALID_SAMPLE_NAME, INVALID_SAMPLE_ROWS, SAMPLE_NAME, SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyParseError, beginProcessing, cancelProcessing, initialImportState, type ImportState } from "@/lib/import/state";
import { MAX_FILE_BYTES } from "@/lib/import/validate";
import type { View } from "@/lib/domain/views";

// One-screen state machine (contract §4). UI-02 adds the Import workflow; Inbox/Results stay empty until UI-03+.
export default function Page() {
  const [view, setView] = useState<View>("import");
  const [importState, setImportStateRaw] = useState<ImportState>(initialImportState);
  const [formKey, setFormKey] = useState(0);

  const setImportState = (next: (s: ImportState) => ImportState) => {
    setImportStateRaw(next);
    setFormKey((k) => k + 1);
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const importRows = (rows: readonly RawRow[], name: string) => {
    if (importState.records.length && !window.confirm("A new import will replace this in-memory batch and its reviews. Export your current results before continuing. Continue?")) return;
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

  const reset = () => {
    if (!window.confirm("Reset the hi-fi prototype? This will discard all local simulated reviews.")) return;
    setImportState(() => initialImportState);
    navigate("import");
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
          // Processing adapter and simulated results belong to UI-03; not wired in this slice.
          onRevealResults={() => {}}
        />
      </section>
      <section id="inbox-view" className={view === "inbox" ? undefined : "hidden"}>
        <InboxWorkspace onNavigate={navigate} />
      </section>
      <section id="results-view" className={view === "results" ? undefined : "hidden"}>
        <ResultsWorkspace onNavigate={navigate} />
      </section>
    </AppShell>
  );
}
