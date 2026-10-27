import { canApprove, hadBlocker } from "@/lib/domain/transitions";
import type { InboxRecord } from "@/lib/domain/types";

type Props = {
  r: InboxRecord;
  onDraft: (text: string) => void;
  onRecheck: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNextPending: () => void;
};

// Draft block and decision bar from details() in the approved V1.1 HTML.
// Approve/Reject record an internal review decision only. There is no send path.
export function DraftReviewActions({ r, onDraft, onRecheck, onApprove, onReject, onNextPending }: Props) {
  const approvable = canApprove(r);
  return (
    <>
      <div className="detailblock">
        <div className="detailheading"><span className="heading-icon ai-icon">✎</span> Draft response <span className="edit-label">Human-editable</span></div>
        <div className="field"><label htmlFor="draftEditor">Editable response</label><textarea id="draftEditor" className="draftarea" value={r.currentDraft ?? ""} onChange={(e) => onDraft(e.target.value)}></textarea></div>
        <div className="spacer"></div>
        <div className="row"><span className="muted tiny">Editing any approved draft resets its review to Pending.</span>{hadBlocker(r) && <button className="btn small" onClick={onRecheck}>Run limited mock check</button>}</div>
        <div className="spacer"></div>
        <details><summary className="small">View preserved original AI output</summary><div className="readback">{r.originalAiDraft}</div></details>
      </div>
      <div className="detailblock decisionbar">
        <div className="row">
          <span className="muted tiny">Approval records a decision; it does not send a message.</span>
          <div className="actions">
            <button className="btn danger" onClick={onReject}>Reject draft</button>
            <button className="btn primary" id="approveDraft" disabled={!approvable} title={approvable ? undefined : "Resolve blocker or add valid text first"} onClick={onApprove}>Approve draft</button>
          </div>
        </div>
        <div className="row mt next-row">
          <span className="muted small" id="decisionHint">{approvable ? "Ready for human review" : "Approval unavailable: blank or blocked draft"}</span>
          <button className="btn small" onClick={onNextPending}>Next pending →</button>
        </div>
      </div>
    </>
  );
}
