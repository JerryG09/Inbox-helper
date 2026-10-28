import type { InboxRecord } from "@/lib/domain/types";
import { filtered, resolveSelection, stats, type InboxView, type ProcessFilter, type ReviewFilter } from "@/lib/inbox/inbox";
import type { View } from "@/lib/domain/views";
import { CandidateReview, type ReviewHandlers } from "./CandidateReview";
import { MessageQueue } from "./MessageQueue";

type Props = ReviewHandlers & {
  records: InboxRecord[];
  view: InboxView;
  editedKey: string | null;
  onNavigate: (view: View) => void;
  onSelect: (key: string) => void;
  onProcessFilter: (v: ProcessFilter) => void;
  onReviewFilter: (v: ReviewFilter) => void;
  onAttentionOnly: (v: boolean) => void;
  onClearFilters: () => void;
  onFailedQueue: () => void;
  onBackToList: () => void;
  onNextPending: () => void;
  onRetryOne: (key: string) => void;
  onRetryFailed: () => void;
};

// Inbox & Review workspace from renderInbox() in the approved V1.1 HTML.
export function InboxWorkspace(p: Props) {
  if (!p.records.length) {
    return (
      <div className="blank large-blank">
        <span className="blank-symbol">✉</span>
        <b>Your inbox is waiting</b>
        <div className="muted small">Import and process candidate messages to create a review queue.</div>
        <button className="btn primary" onClick={() => p.onNavigate("import")}>Start with an import →</button>
      </div>
    );
  }
  const s = stats(p.records);
  const visible = filtered(p.records, p.view);
  const selectedKey = resolveSelection(visible, p.view.selectedKey);
  const view = { ...p.view, selectedKey };
  const record = p.records.find((r) => r.key === selectedKey) ?? null;

  return (
    <>
      <Metrics s={s} />
      <div className="work-toolbar">
        <div>
          <div className="work-toolbar-title">Review workspace <span className="badge">{`${s.completed} AI results`}</span></div>
          <div className="work-toolbar-sub">{`${s.approved} approved · ${s.rejected} rejected drafts · ${s.attention} flagged`}</div>
        </div>
        <div className="actions">
          <button className="btn small" onClick={p.onFailedQueue}>{`Failed queue (${s.failed})`}</button>
          <button className="btn small" onClick={p.onRetryFailed} disabled={!s.failed}>Retry failed</button>
          <button className="btn small primary" onClick={() => p.onNavigate("results")}>View results ↗</button>
        </div>
      </div>
      {/* UX-AI-02 (AI-01 carry-forward A): a record being (re)processed may be hidden by the current filter, e.g. a
          retried record leaves the Failed queue. This existing-style notice keeps progress visible and announced in
          every layout (it is not inside the toolbar that the mobile detail view hides) and disappears on settlement. */}
      {s.processing > 0 && (
        <div className="notice mb" role="status" id="processingIndicator">{`Processing ${s.processing} message${s.processing === 1 ? "" : "s"}… Results appear in the queue when processing finishes. Other messages remain available for review.`}</div>
      )}
      <div className={`workgrid ${view.mobileDetail ? "mobile-detail-open" : ""}`}>
        <MessageQueue
          visible={visible} total={s.total} view={view} stats={s}
          onSelect={p.onSelect} onProcessFilter={p.onProcessFilter} onReviewFilter={p.onReviewFilter}
          onAttentionOnly={p.onAttentionOnly} onClearFilters={p.onClearFilters} onViewResults={() => p.onNavigate("results")}
        />
        <section className="rightpane">
          <CandidateReview
            r={record} editedSinceRender={record !== null && p.editedKey === record.key}
            onBackToList={p.onBackToList} onNextPending={p.onNextPending} onRetry={p.onRetryOne}
            onPrimary={p.onPrimary} onSecondary={p.onSecondary} onDraft={p.onDraft} onRecheck={p.onRecheck} onApprove={p.onApprove} onReject={p.onReject}
          />
          <div id="draft-change-indicator" className="muted tiny" aria-live="polite">{record !== null && p.editedKey === record.key ? "Draft changed. Review pending." : ""}</div>
        </section>
      </div>
    </>
  );
}

export function Metrics({ s }: { s: ReturnType<typeof stats> }) {
  return (
    <div className="metrics">
      <div className="metric"><div className="metric-top"><span>Total messages</span><span className="metric-icon violet">▣</span></div><div className="number">{s.total}<span className="metric-unit"> in batch</span></div><div className="metric-bottom">Validated input records</div></div>
      <div className="metric"><div className="metric-top"><span>AI completed</span><span className="metric-icon teal">✦</span></div><div className="number">{s.completed}<span className="metric-unit"> processed</span></div><div className="metric-bottom">Ready for human inspection</div></div>
      <div className="metric"><div className="metric-top"><span>Awaiting review</span><span className="metric-icon amber">◷</span></div><div className="number">{s.pending}<span className="metric-unit"> pending</span></div><div className="metric-bottom">Recruiter decisions needed</div></div>
      <div className="metric"><div className="metric-top"><span>AI failures</span><span className="metric-icon red">!</span></div><div className="number">{s.failed}<span className="metric-unit"> failed</span></div><div className="metric-bottom">Recover without restarting</div></div>
    </div>
  );
}
