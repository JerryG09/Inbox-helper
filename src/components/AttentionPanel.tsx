import type { InboxRecord } from "@/lib/domain/types";
import { BLOCKED_FINDING, UNSUPPORTED_HIRING_FLAG } from "@/lib/processing/processor";

// "Attention & safety" block from details() in the approved V1.1 HTML. Display only in UI-03;
// blocker correction and recheck transitions are UI-04.
export function AttentionPanel({ r }: { r: InboxRecord }) {
  const blocked = r.attention === "blocked";
  const reasons = r.currentAttentionReasons.filter((x) => x !== UNSUPPORTED_HIRING_FLAG);
  const hadBlocker = r.historicalAiFindings.includes(BLOCKED_FINDING);
  return (
    <div className="detailblock">
      <div className="detailheading"><span className="heading-icon">!</span> Attention & safety</div>
      <div id="attentionPanel">
        {blocked ? (
          <>
            <div className="notice block"><b>BLOCKED · Unsupported hiring outcome</b><p>The original simulated AI reply asserted a hiring decision without evidence. Edit the draft, then run the limited mock phrase check. Human review is still required.</p></div>
            {reasons.map((x) => <div className="notice warn mt" key={x}>{x}</div>)}
          </>
        ) : reasons.length ? (
          reasons.map((x) => <div className="notice warn mb" key={x}><b>Attention:</b>{` ${x}`}</div>)
        ) : (
          <div className="notice">No current attention reasons recorded. Human review still required.</div>
        )}
      </div>
      {hadBlocker && (
        <>
          <div className="spacer"></div>
          <details><summary className="small">Historical AI finding</summary><div className="readback">{r.historicalAiFindings.join(" | ")}</div></details>
        </>
      )}
    </div>
  );
}
