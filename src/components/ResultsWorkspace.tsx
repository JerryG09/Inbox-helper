import type { View } from "@/lib/domain/views";

// No-data state from renderResults() in the approved V1.1 HTML. Counts and export arrive in UI-05.
export function ResultsWorkspace({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div className="blank">
      <b>No batch results yet</b>
      <div className="muted small">Import messages and run the local processing simulation first.</div>
      <button className="btn primary" onClick={() => onNavigate("import")}>Start with Import →</button>
    </div>
  );
}
