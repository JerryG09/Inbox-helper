import type { InboxRecord } from "@/lib/domain/types";
import { forbiddenDraft } from "@/lib/inbox/inbox";

// Draft block and decision bar from details() in the approved V1.1 HTML.
// UI-03 renders them for layout fidelity only: editing, approve/reject and the mock recheck are UI-04 and are inert here.
export function DraftReviewActions({ r, hadBlocker, onNextPending }: { r: InboxRecord; hadBlocker: boolean; onNextPending: () => void }) {
  const draft = r.currentDraft ?? "";
  const canApprove = Boolean(draft.trim() && r.attention !== "blocked" && !forbiddenDraft(draft));
  return (
    <>
      <div className="detailblock">
        <div className="detailheading"><span className="heading-icon ai-icon">✎</span> Draft response <span className="edit-label">Human-editable</span></div>
        <div className="field"><label htmlFor="draftEditor">Editable response</label><textarea id="draftEditor" className="draftarea" value={draft} readOnly></textarea></div>
        <div className="spacer"></div>
        <div className="row"><span className="muted tiny">Editing any approved draft resets its review to Pending.</span>{hadBlocker && <button className="btn small">Run limited mock check</button>}</div>
        <div className="spacer"></div>
        <details><summary className="small">View preserved original AI output</summary><div className="readback">{r.originalAiDraft}</div></details>
      </div>
      <div className="detailblock decisionbar">
        <div className="row">
          <span className="muted tiny">Approval records a decision; it does not send a message.</span>
          <div className="actions">
            <button className="btn danger">Reject draft</button>
            <button className="btn primary" id="approveDraft" disabled={!canApprove} title={canApprove ? undefined : "Resolve blocker or add valid text first"}>Approve draft</button>
          </div>
        </div>
        <div className="row mt next-row">
          <span className="muted small" id="decisionHint">{canApprove ? "Ready for human review" : "Approval unavailable: blank or blocked draft"}</span>
          <button className="btn small" onClick={onNextPending}>Next pending →</button>
        </div>
      </div>
    </>
  );
}
