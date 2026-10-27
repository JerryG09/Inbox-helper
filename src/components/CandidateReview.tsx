import { INTENTS } from "@/lib/domain/intents";
import type { InboxRecord } from "@/lib/domain/types";
import { initials, intentLabel, REVIEW_LABEL } from "@/lib/inbox/inbox";
import { BLOCKED_FINDING } from "@/lib/processing/processor";
import { AttentionPanel } from "./AttentionPanel";
import { DraftReviewActions } from "./DraftReviewActions";
import { ReviewTag } from "./MessageQueue";

type Props = { r: InboxRecord | null; onBackToList: () => void; onNextPending: () => void };

const noop = () => {};

// Right pane from details() in the approved V1.1 HTML. The original candidate message is always shown, verbatim.
// Classification controls are display-only in UI-03 (corrections are UI-04); retry is UI-05.
export function CandidateReview({ r, onBackToList, onNextPending }: Props) {
  if (!r) {
    return <div className="blank" role="status"><b>Select a message</b><div className="muted small">Choose a row to inspect the candidate message, AI assessment and draft.</div></div>;
  }

  const head = (
    <>
      <div className="row detail-top">
        <div className="candidate-heading">
          <span className="avatar large">{initials(r)}</span>
          <div>
            <div className="detail-overline">{`CANDIDATE MESSAGE · ${r.importedId}`}</div>
            <h2>{r.candidateName || "Unnamed candidate"}</h2>
            <div className="muted small">{r.subject || "No subject"}</div>
          </div>
        </div>
        <span id="detailReviewTag"><ReviewTag r={r} /></span>
      </div>
      <div className="detailblock"><div className="detailheading"><span className="heading-icon">◫</span> Original candidate message</div><div className="original">{r.message}</div></div>
    </>
  );

  if (r.processing === "failed") {
    return (
      <>
        <div className="mobile-return"><button className="btn small" onClick={onBackToList}>← All messages</button></div>
        {head}
        <div className="detailblock">
          <div className="notice block"><b>AI processing failed</b><p>{`${r.error?.description}. No classification or draft was produced.`}</p></div>
          <p className="muted small">Retry affects this message only. Previous human reviews remain unchanged.</p>
          <button className="btn primary">Retry this message (simulation) →</button>
        </div>
      </>
    );
  }
  if (r.processing !== "completed") {
    return <>{head}<div className="notice mt">Queued for processing. No review actions are available.</div></>;
  }

  const primary = r.primaryIntent!;
  const hadBlocker = r.historicalAiFindings.includes(BLOCKED_FINDING);
  return (
    <>
      <div className="mobile-return">
        <button className="btn small" onClick={onBackToList}>← All messages</button>
        <button className="btn small" onClick={() => document.getElementById("draftEditor")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Jump to reply ↓</button>
      </div>
      {head}
      <div className="detailblock">
        <div className="detailheading"><span className="heading-icon ai-icon">✦</span> AI assessment · editable classification</div>
        <div className="detailgrid">
          <div className="field"><label htmlFor="primaryIntent">Primary intent</label><select id="primaryIntent" value={intentLabel(primary)} onChange={noop}>{INTENTS.map((i) => <option key={i.id}>{i.label}</option>)}</select></div>
          <div className="field"><label>Review status</label><div className="notice" id="humanReviewStatus">{REVIEW_LABEL[r.review!]}</div></div>
        </div>
        <div className="spacer"></div>
        <div className="field">
          <label>Secondary intents</label>
          <div className="secondary-options">
            {INTENTS.filter((i) => i.id !== primary).map((i) => (
              <label key={i.id}><input type="checkbox" value={i.label} checked={r.secondaryIntents.includes(i.id)} onChange={noop} />{i.label}</label>
            ))}
          </div>
        </div>
        <div className="spacer"></div>
        <div className="notice ai-summary"><b>AI summary:</b>{` ${r.aiSummary}`}</div>
      </div>
      <AttentionPanel r={r} />
      <DraftReviewActions r={r} hadBlocker={hadBlocker} onNextPending={onNextPending} />
    </>
  );
}
