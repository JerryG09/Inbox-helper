import { INTENTS, type IntentId } from "@/lib/domain/intents";
import type { InboxRecord } from "@/lib/domain/types";
import { initials, intentLabel, REVIEW_LABEL } from "@/lib/inbox/inbox";
import { AttentionPanel } from "./AttentionPanel";
import { DraftReviewActions } from "./DraftReviewActions";
import { ReviewTag } from "./MessageQueue";
import { useLiveCopy } from "./RuntimeMode";

export type ReviewHandlers = {
  onPrimary: (key: string, intent: IntentId) => void;
  onSecondary: (key: string, intent: IntentId, checked: boolean) => void;
  onDraft: (key: string, text: string) => void;
  onRecheck: (key: string) => void;
  onApprove: (key: string) => void;
  onReject: (key: string) => void;
};

type Props = { r: InboxRecord | null; editedSinceRender: boolean; onBackToList: () => void; onNextPending: () => void; onRetry: (key: string) => void } & ReviewHandlers;

// Right pane from details() in the approved V1.1 HTML. The original candidate message is always shown, verbatim.
// Classification correction, draft editing and review decisions are live (UI-04); failed-only retry is live (UI-05A).
export function CandidateReview(p: Props) {
  const { r, onBackToList, onNextPending } = p;
  const liveCopy = useLiveCopy();
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
          <button id="retryOne" className="btn primary" onClick={() => p.onRetry(r.key)}>{liveCopy ? "Retry this message →" : "Retry this message (simulation) →"}</button>
        </div>
      </>
    );
  }
  if (r.processing !== "completed") {
    // UX-05A-01 (owner-authorized copy/accessibility exception, 28 Oct 2026): Processing is no longer labelled "Queued".
    // Provider-neutral wording; role="status" exposes it politely without assertive announcements.
    const notice = r.processing === "processing"
      ? "Processing this message. No review actions are available until processing finishes."
      : "Queued for processing. No review actions are available.";
    return <>{head}<div className="notice mt" role="status">{notice}</div></>;
  }

  const primary = r.primaryIntent!;
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
          <div className="field"><label htmlFor="primaryIntent">Primary intent</label><select id="primaryIntent" value={intentLabel(primary)} onChange={(e) => p.onPrimary(r.key, INTENTS.find((i) => i.label === e.target.value)!.id)}>{INTENTS.map((i) => <option key={i.id}>{i.label}</option>)}</select></div>
          <div className="field"><label>Review status</label><div className="notice" id="humanReviewStatus">{REVIEW_LABEL[r.review!]}</div></div>
        </div>
        <div className="spacer"></div>
        <div className="field">
          <label>Secondary intents</label>
          <div className="secondary-options">
            {INTENTS.filter((i) => i.id !== primary).map((i) => (
              <label key={i.id}><input type="checkbox" value={i.label} checked={r.secondaryIntents.includes(i.id)} onChange={(e) => p.onSecondary(r.key, i.id, e.target.checked)} />{i.label}</label>
            ))}
          </div>
        </div>
        <div className="spacer"></div>
        <div className="notice ai-summary"><b>AI summary:</b>{` ${r.aiSummary}`}</div>
        {r.outcomeSource === "anthropic" && <div className="muted tiny mt" id="aiProvenance">{`Generated by Anthropic · ${r.providerMeta?.model ?? "model not reported"} · suggestion for recruiter review only`}</div>}
      </div>
      <AttentionPanel r={r} editedSinceRender={p.editedSinceRender} />
      <DraftReviewActions
        r={r} onNextPending={onNextPending} onDraft={(t) => p.onDraft(r.key, t)} onRecheck={() => p.onRecheck(r.key)}
        onApprove={() => p.onApprove(r.key)} onReject={() => p.onReject(r.key)}
      />
    </>
  );
}
