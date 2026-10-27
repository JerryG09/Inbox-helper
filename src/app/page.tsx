"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportWorkspace } from "@/components/ImportWorkspace";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { ResultsWorkspace } from "@/components/ResultsWorkspace";
import type { View } from "@/lib/domain/views";

// One-screen state machine (contract §4). DAY1-01 covers navigation only; record state arrives in later slices.
export default function Page() {
  const [view, setView] = useState<View>("import");

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <AppShell view={view} onNavigate={navigate} onReset={() => navigate("import")}>
      <section id="import-view" className={view === "import" ? undefined : "hidden"}>
        <ImportWorkspace />
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
