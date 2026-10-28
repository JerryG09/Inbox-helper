import { useRef } from "react";
import type { ImportState } from "@/lib/import/state";
import { MAX_LIVE_MESSAGES } from "@/lib/processing/live-contract";
import { useRuntimeMode } from "./RuntimeMode";

type Props = {
  state: ImportState;
  // Bumped on every import-state change so the manual form remounts empty, as the prototype's re-render does.
  formKey: number;
  onLoadSample: () => void;
  onLoadInvalidSample: () => void;
  onFile: (file: File) => void;
  onManual: (row: { id: string; candidate_name: string; subject: string; message: string }) => void;
  onProcess: () => void;
  onCancelProcessing: () => void;
  onRevealResults: () => void;
};

// Import screen from renderImport() in the approved V1.1 HTML: entry methods, validation preview,
// file-level error, empty state, and the queued processing state. DOM and copy carried over verbatim.
// Mixed text is rendered as ONE text node (template literal): split nodes are shaped separately and shift glyphs.
export function ImportWorkspace(p: Props) {
  const { state } = p;
  const idRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const mode = useRuntimeMode();

  if (state.processing && mode.kind !== "simulated") return <LiveProcessing state={state} model={mode.kind === "anthropic" ? mode.model : null} onStart={p.onRevealResults} onCancel={p.onCancelProcessing} />;
  if (state.processing) {
    return (
      <div className="panel">
        <div className="section-label">Processing state · simulation</div>
        <h2>Batch prepared for processing</h2>
        <p className="sub">{`${state.records.length} queued; no model calls have been made. In the real app this state will show live per-record progress and errors.`}</p>
        <div className="spacer"></div>
        <div className="outline">
          <div className="row"><b>Queued</b><span className="badge">{`${state.records.length} messages`}</span></div>
          <div className="spacer"></div>
          <div className="statsline"><span style={{ width: "0%", background: "#777" }}></span></div>
        </div>
        <div className="spacer"></div>
        <div className="actions">
          <button className="btn primary" onClick={p.onRevealResults}>Reveal simulated AI results →</button>
          <button className="btn" onClick={p.onCancelProcessing}>Cancel simulation</button>
        </div>
      </div>
    );
  }

  const submitManual = () =>
    p.onManual({
      id: idRef.current?.value.trim() ?? "",
      candidate_name: nameRef.current?.value.trim() ?? "",
      subject: subjectRef.current?.value.trim() ?? "",
      message: messageRef.current?.value.trim() ?? "",
    });

  return (
    <>
      <div className="grid2" key={p.formKey}>
        <div className="panel">
          <div className="section-label">Entry method A</div>
          <h2>CSV import</h2>
          <p className="sub small">Required: <code>id</code>, <code>message</code>. Optional: <code>candidate_name</code>, <code>subject</code>.</p>
          <div className="blank mt">
            <b>Upload CSV</b>
            <div className="muted small">{mode.kind === "simulated" ? "CSV is parsed locally for preview. In a future AI-enabled app, messages would be sent to a configured model provider for processing." : "CSV is parsed locally for preview. Valid messages are sent to Anthropic only when you start processing. Use synthetic data only."}</div>
            <label className="btn" htmlFor="csvFile">Choose local CSV</label>
            <input
              className="sr-only" id="csvFile" type="file" accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onFile(f); }}
            />
          </div>
          <div className="actions mt">
            <button className="btn" onClick={p.onLoadSample}>Load 6-message sample</button>
            <button className="btn" onClick={p.onLoadInvalidSample}>Test invalid rows</button>
          </div>
        </div>
        <div className="panel">
          <div className="section-label">Entry method B</div>
          <h2>Manual message</h2>
          <div className="form-row">
            <div className="field"><label htmlFor="manual-id">Message ID *</label><input id="manual-id" ref={idRef} placeholder="M101" maxLength={64} /></div>
            <div className="field"><label htmlFor="manual-name">Candidate name</label><input id="manual-name" ref={nameRef} placeholder="Example Candidate" /></div>
          </div>
          <div className="field mt"><label htmlFor="manual-subject">Subject</label><input id="manual-subject" ref={subjectRef} placeholder="Interview enquiry" /></div>
          <div className="field mt"><label htmlFor="manual-message">Message *</label><textarea id="manual-message" ref={messageRef} rows={4} placeholder="Paste the candidate's enquiry"></textarea></div>
          <div className="actions mt"><button className="btn" onClick={submitManual}>Validate manual message</button></div>
        </div>
      </div>
      {state.mode === "parse-error" && (
        <div className="notice block mt"><b>Import error</b>{` — ${state.parseError}. Choose a corrected CSV file.`}</div>
      )}
      {state.mode === "preview" && <ValidationPreview state={state} onProcess={p.onProcess} />}
      {state.mode === "empty" && (
        <div className="notice mt">Empty state: no messages loaded. Select a CSV, load synthetic sample messages, or enter a manual message.</div>
      )}
    </>
  );
}

// UX-AI-01: live variant of the processing state, reusing the V1.1 panel/outline/statsline markup. Nothing is sent
// until the recruiter starts processing; while the request is in flight the panel reports it via role="status".
function LiveProcessing({ state, model, onStart, onCancel }: { state: ImportState; model: string | null; onStart: () => void; onCancel: () => void }) {
  const total = state.records.length;
  const inFlight = state.records.filter((r) => r.processing === "processing").length;
  const overLimit = total > MAX_LIVE_MESSAGES;
  const status = !model
    ? "Live AI processing is unavailable on this server. No model calls can be made and no simulated results will be shown."
    : inFlight
      ? `Processing ${inFlight} message${inFlight === 1 ? "" : "s"} with Anthropic (${model}). This can take several seconds per message.`
      : `${total} queued. Nothing has been sent yet. Starting processing sends these messages to Anthropic (${model}) to classify them and draft suggested replies.`;
  return (
    <div className="panel">
      <div className="section-label">{model ? "Processing state · Anthropic" : "Processing state · live AI unavailable"}</div>
      <h2>Batch prepared for processing</h2>
      <p className="sub" role="status" id="liveProcessingStatus">{status}</p>
      {overLimit && <div className="notice warn mt">{`Live processing is limited to ${MAX_LIVE_MESSAGES} messages per request. Import ${MAX_LIVE_MESSAGES} or fewer messages to process them.`}</div>}
      <div className="spacer"></div>
      <div className="outline">
        <div className="row"><b>{inFlight ? "Processing" : "Queued"}</b><span className="badge">{`${total} messages`}</span></div>
        <div className="spacer"></div>
        <div className="statsline"><span style={{ width: "0%", background: "#777" }}></span></div>
      </div>
      <div className="spacer"></div>
      <div className="actions">
        <button className="btn primary" onClick={onStart} disabled={inFlight > 0 || overLimit}>{inFlight ? "Processing…" : "Start AI processing →"}</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ValidationPreview({ state, onProcess }: { state: ImportState; onProcess: () => void }) {
  const invalidCount = state.invalid.length;
  return (
    <div className="panel mt">
      <div className="row"><h2>Validation preview</h2><span className="badge">{state.fileName}</span></div>
      <div className="actions mb">
        <span className="badge ok">{`${state.valid.length} valid`}</span>
        <span className={`badge ${invalidCount ? "block" : ""}`}>{`${invalidCount} invalid`}</span>
      </div>
      {invalidCount > 0 && <div className="notice warn mb">Invalid rows are excluded from processing. Correct the source file and re-import to include them.</div>}
      <div style={{ overflow: "auto" }}>
        <table className="preview">
          <thead><tr><th>Row</th><th>ID</th><th>Candidate</th><th>Subject</th><th>Validation</th></tr></thead>
          <tbody>
            {state.preview.map((r) => (
              <tr key={r.sourceRow} className={r.reasons ? "error-row" : ""}>
                <td>{r.sourceRow}</td>
                <td>{r.id}</td>
                <td>{r.candidateName || "—"}</td>
                <td>{r.subject || "—"}</td>
                <td>{r.reasons ? <span className="badge block">{r.reasons.join("; ")}</span> : <span className="badge ok">Valid</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="spacer"></div>
      <div className="row">
        <span className="small muted">Cap: 50 messages per batch; 2,000 characters per message.</span>
        <button className="btn primary" disabled={!state.valid.length} onClick={onProcess}>{`Process ${state.valid.length} valid messages →`}</button>
      </div>
    </div>
  );
}
