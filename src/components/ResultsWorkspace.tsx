import type { InboxRecord } from "@/lib/domain/types";
import type { View } from "@/lib/domain/views";
import { intentLabel, PROCESSING_LABEL, REVIEW_LABEL, stats } from "@/lib/inbox/inbox";
import { attentionBadgeClass, attentionState, historyLabel } from "@/lib/results/results";
import { Metrics } from "./InboxWorkspace";

type Props = { records: readonly InboxRecord[]; onNavigate: (view: View) => void; onDownload: () => void };

// Results screen from renderResults() in the approved V1.1 HTML. Derived from the current records on every render.
export function ResultsWorkspace({ records, onNavigate, onDownload }: Props) {
  if (!records.length) {
    return (
      <div className="blank">
        <b>No batch results yet</b>
        <div className="muted small">Import messages and run the local processing simulation first.</div>
        <button className="btn primary" onClick={() => onNavigate("import")}>Start with Import →</button>
      </div>
    );
  }
  const s = stats(records);
  return (
    <>
      <Metrics s={s} />
      <div className="panel">
        <div className="row">
          <div>
            <h2>Batch outcome, not just AI output</h2>
            <div className="muted small">Every imported valid message remains visible, including failures and rejected drafts.</div>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => onNavigate("inbox")}>Back to review</button>
            <button className="btn primary" onClick={onDownload}>Download CSV results</button>
          </div>
        </div>
        <div className="spacer"></div>
        <div className="section-label">AI processing counts</div>
        <div className="hstack mb">
          <span className="badge">{`Queued ${s.queued}`}</span><span className="badge">{`Processing ${s.processing}`}</span><span className="badge ok">{`Completed ${s.completed}`}</span><span className="badge block">{`Failed ${s.failed}`}</span>
        </div>
        <div className="section-label">Human decisions within completed items</div>
        <div className="hstack mb">
          <span className="badge">{`Pending ${s.pending}`}</span><span className="badge ok">{`Approved ${s.approved}`}</span><span className="badge">{`Rejected draft ${s.rejected}`}</span>
        </div>
        <div className="notice" id="resultsInvariant">
          {`Invariant: ${s.total} valid = ${s.queued} queued + ${s.processing} processing + ${s.completed} completed + ${s.failed} failed. AI completed ${s.completed} = ${s.pending} pending + ${s.approved} approved + ${s.rejected} rejected.`}
        </div>
        <div className="spacer"></div>
        <div style={{ overflow: "auto" }}>
          <table className="preview" aria-label="Batch results by message">
            <thead>
              <tr><th scope="col">Candidate</th><th scope="col">AI processing</th><th scope="col">Primary intent</th><th scope="col">Human review</th><th scope="col">Current attention</th><th scope="col">History</th></tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const a = attentionState(r);
                return (
                  <tr key={r.key}>
                    <td>{r.candidateName || r.importedId}</td>
                    <td>{PROCESSING_LABEL[r.processing]}</td>
                    <td>{r.primaryIntent ? intentLabel(r.primaryIntent) : "—"}</td>
                    <td>{r.review ? REVIEW_LABEL[r.review] : "N/A"}</td>
                    <td><span className={`badge ${attentionBadgeClass(a)}`}>{a}</span></td>
                    <td>{historyLabel(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="spacer"></div>
        <div className="notice warn">Export includes unapproved, rejected and failed records and distinguishes current attention from historical AI findings. Spreadsheet-dangerous input cells are prefixed with an apostrophe in CSV only. This is mock data; export does not approve or send a message.</div>
      </div>
    </>
  );
}
