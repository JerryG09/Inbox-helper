// Empty Import state from renderImport() in the approved V1.1 HTML. Static in DAY1-01:
// CSV parsing, sample loading and manual validation are wired in slice UI-02.
export function ImportWorkspace() {
  return (
    <>
      <div className="grid2">
        <div className="panel">
          <div className="section-label">Entry method A</div>
          <h2>CSV import</h2>
          <p className="sub small">Required: <code>id</code>, <code>message</code>. Optional: <code>candidate_name</code>, <code>subject</code>.</p>
          <div className="blank mt">
            <b>Upload CSV</b>
            <div className="muted small">CSV is parsed locally for preview. In a future AI-enabled app, messages would be sent to a configured model provider for processing.</div>
            <label className="btn" htmlFor="csvFile">Choose local CSV</label>
            <input className="sr-only" id="csvFile" type="file" accept=".csv,text/csv" />
          </div>
          <div className="actions mt">
            <button className="btn">Load 6-message sample</button>
            <button className="btn">Test invalid rows</button>
          </div>
        </div>
        <div className="panel">
          <div className="section-label">Entry method B</div>
          <h2>Manual message</h2>
          <div className="form-row">
            <div className="field"><label htmlFor="manual-id">Message ID *</label><input id="manual-id" placeholder="M101" maxLength={64} /></div>
            <div className="field"><label htmlFor="manual-name">Candidate name</label><input id="manual-name" placeholder="Example Candidate" /></div>
          </div>
          <div className="field mt"><label htmlFor="manual-subject">Subject</label><input id="manual-subject" placeholder="Interview enquiry" /></div>
          <div className="field mt"><label htmlFor="manual-message">Message *</label><textarea id="manual-message" rows={4} placeholder="Paste the candidate's enquiry"></textarea></div>
          <div className="actions mt"><button className="btn">Validate manual message</button></div>
        </div>
      </div>
      <div className="notice mt">Empty state: no messages loaded. Select a CSV, load synthetic sample messages, or enter a manual message.</div>
    </>
  );
}
