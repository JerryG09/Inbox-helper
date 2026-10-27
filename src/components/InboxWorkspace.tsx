import type { View } from "@/lib/domain/views";

// No-messages state from renderInbox() in the approved V1.1 HTML. The queue/review layout arrives in UI-03/UI-04.
export function InboxWorkspace({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div className="blank large-blank">
      <span className="blank-symbol">✉</span>
      <b>Your inbox is waiting</b>
      <div className="muted small">Import and process candidate messages to create a review queue.</div>
      <button className="btn primary" onClick={() => onNavigate("import")}>Start with an import →</button>
    </div>
  );
}
