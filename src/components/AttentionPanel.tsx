import { blockerResolved, hadBlocker } from "@/lib/domain/transitions";
import type { InboxRecord } from "@/lib/domain/types";
import { UNSUPPORTED_HIRING_FLAG } from "@/lib/processing/processor";
import { useLiveCopy } from "./RuntimeMode";

// "Attention & safety" block from details()/draftChanged() in the approved V1.1 HTML.
// `editedSinceRender` mirrors the prototype's in-place update after a draft keystroke on a blocker record.
export function AttentionPanel({ r, editedSinceRender }: { r: InboxRecord; editedSinceRender: boolean }) {
  const blocked = r.attention === "blocked";
  const reasons = r.currentAttentionReasons.filter((x) => x !== UNSUPPORTED_HIRING_FLAG);
  const blocker = hadBlocker(r);
  const check = useLiveCopy() ? "limited phrase check" : "limited mock phrase check";
  const original = useLiveCopy() ? "The original AI reply" : "The original simulated AI reply";
  return (
    <div className="detailblock">
      <div className="detailheading"><span className="heading-icon">!</span> Attention & safety</div>
      <div id="attentionPanel">
        {blocker && editedSinceRender ? (
          <div className="notice block"><b>BLOCKED · Original AI claim needs rechecking</b><p>{`Draft edited. Run the ${check}, then inspect the reply. The checker cannot certify safety.`}</p></div>
        ) : blocked ? (
          <>
            <div className="notice block"><b>BLOCKED · Unsupported hiring outcome</b><p>{`${original} asserted a hiring decision without evidence. Edit the draft, then run the ${check}. Human review is still required.`}</p></div>
            {reasons.map((x) => <div className="notice warn mt" key={x}>{x}</div>)}
          </>
        ) : blockerResolved(r) ? (
          <>
            <div className="notice ok"><b>Initial AI claim corrected in the current draft.</b><p>{`The historical unsafe output is preserved. The ${check} does not certify this reply as safe; review it before approval.`}</p></div>
            {reasons.map((x) => <div className="notice warn mt" key={x}>{x}</div>)}
          </>
        ) : reasons.length ? (
          reasons.map((x) => <div className="notice warn mb" key={x}><b>Attention:</b>{` ${x}`}</div>)
        ) : (
          <div className="notice">No current attention reasons recorded. Human review still required.</div>
        )}
      </div>
      {blocker && (
        <>
          <div className="spacer"></div>
          <details><summary className="small">Historical AI finding</summary><div className="readback">{r.historicalAiFindings.join(" | ")}</div></details>
        </>
      )}
    </div>
  );
}
