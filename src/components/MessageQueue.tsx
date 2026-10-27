import { blockerResolved } from "@/lib/domain/transitions";
import type { InboxRecord } from "@/lib/domain/types";
import { grouped, initials, REVIEW_LABEL, type InboxView, type ProcessFilter, type ReviewFilter } from "@/lib/inbox/inbox";

type Props = {
  visible: InboxRecord[];
  total: number;
  view: InboxView;
  stats: { pending: number; completed: number; approved: number; rejected: number; failed: number };
  onSelect: (key: string) => void;
  onProcessFilter: (v: ProcessFilter) => void;
  onReviewFilter: (v: ReviewFilter) => void;
  onAttentionOnly: (v: boolean) => void;
  onClearFilters: () => void;
  onViewResults: () => void;
};

// Left pane from renderInbox()/groupedList() in the approved V1.1 HTML: filters + intent-grouped queue.
export function MessageQueue(p: Props) {
  const { view } = p;
  return (
    <section className="leftpane">
      <div className="filters">
        <div className="row mb">
          <div><b>Message queue</b><div className="muted tiny">Grouped by primary intent</div></div>
          <span className="queue-count">{`${p.visible.length} / ${p.total}`}</span>
        </div>
        <div className="filtergrid">
          <label>AI processing<select id="processFilterSelect" value={view.processFilter} onChange={(e) => p.onProcessFilter(e.target.value as ProcessFilter)}><option>All</option><option>Completed</option><option>Failed</option></select></label>
          <label>Human review<select id="reviewFilterSelect" value={view.reviewFilter} onChange={(e) => p.onReviewFilter(e.target.value as ReviewFilter)}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
        </div>
        <label className="checkline"><input type="checkbox" checked={view.attentionOnly} onChange={(e) => p.onAttentionOnly(e.target.checked)} />{" "}<span>Needs attention only</span></label>
      </div>
      <div className="listbody"><QueueBody {...p} /></div>
    </section>
  );
}

function QueueBody(p: Props) {
  const { view, stats: s } = p;
  if (!p.visible.length) {
    if (view.reviewFilter === "Pending" && s.pending === 0 && s.completed > 0 && view.processFilter !== "Failed" && !view.attentionOnly) {
      return (
        <div className="blank complete-state" role="status">
          <span className="blank-symbol">✓</span><b>All AI-completed messages reviewed</b>
          <div className="muted small">{`${s.approved} approved, ${s.rejected} rejected. ${s.failed ? s.failed + " AI failure(s) still require attention." : "No AI failures remain."}`}</div>
          <button className="btn primary" onClick={p.onViewResults}>Review batch results →</button>
        </div>
      );
    }
    return (
      <div className="blank">
        <span className="blank-symbol">⌕</span><b>No messages match these filters</b>
        <div className="muted small">Clear a filter or choose a different status.</div>
        <button className="btn small" onClick={p.onClearFilters}>Clear filters</button>
      </div>
    );
  }
  // Flat siblings (grouphead, message, message, grouphead, …) as in the prototype; `.message:nth-of-type(3n)` depends on it.
  return (
    <>
      {grouped(p.visible).map(([group, rows]) => [
        <div className="grouphead" key={`g:${group}`}><span>{group}</span><span>{rows.length}</span></div>,
        ...rows.map((r) => (
          <button key={r.key} className={`message ${r.key === view.selectedKey ? "active" : ""}`} onClick={() => p.onSelect(r.key)}>
            <span className="avatar">{initials(r)}</span>
            <span className="message-inner">
              <span className="msgline"><span className="name">{r.candidateName || r.importedId}</span><ReviewTag r={r} /></span>
              <span className="subject">{r.subject || r.message.slice(0, 70)}</span>
              <span className="tags">
                {r.processing === "completed" && r.attention === "blocked" && <span className="badge block">✕ Blocked</span>}
                {r.processing === "completed" && r.attention === "warning" && <span className="badge warn">⚠ Needs attention</span>}
                {r.processing === "completed" && r.attention === "none" && blockerResolved(r) && <span className="badge ok">Initial issue corrected</span>}
                {r.processing === "failed" && <span className="badge block">Retry available</span>}
              </span>
            </span>
          </button>
        )),
      ])}
    </>
  );
}

export function ReviewTag({ r }: { r: InboxRecord }) {
  if (r.processing === "failed") return <span className="badge block">AI failed</span>;
  return <span className={`badge ${r.review === "approved" ? "ok" : ""}`}>{r.review ? REVIEW_LABEL[r.review] : "—"}</span>;
}
