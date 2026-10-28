// Results selectors ported from attentionState()/historicFinding()/renderResults() in the approved V1.1 prototype.
// Pure: derived from the CURRENT InboxRecord state on every call; nothing is snapshotted.
import { blockerResolved, hadBlocker } from "../domain/transitions";
import type { InboxRecord } from "../domain/types";
import { BLOCKED_FINDING } from "../processing/processor";

export type AttentionState =
  | "N/A" | "Blocked" | "Needs attention" | "None"
  | "Corrected — pending review" | "Corrected — approved after review" | "Corrected — rejected draft";

// Current attention. A resolved blocker's history is kept separately (historicalFinding), never hidden by a recheck.
export function attentionState(r: InboxRecord): AttentionState {
  if (r.processing !== "completed") return "N/A";
  if (hadBlocker(r) && !blockerResolved(r)) return "Blocked";
  if (r.currentAttentionReasons.length) return "Needs attention";
  if (blockerResolved(r)) {
    return r.review === "approved" ? "Corrected — approved after review" : r.review === "rejected" ? "Corrected — rejected draft" : "Corrected — pending review";
  }
  return "None";
}

export const attentionBadgeClass = (a: AttentionState) =>
  a === "Blocked" ? "block" : a === "Needs attention" ? "warn" : a.startsWith("Corrected") ? "ok" : "";

// Original AI findings, independent of current attention (prototype historicFinding()).
export const historicalFinding = (r: InboxRecord) => (hadBlocker(r) ? BLOCKED_FINDING : r.historicalAiFindings.join(" | "));

// "History" column of the Results table.
export const historyLabel = (r: InboxRecord) =>
  blockerResolved(r) ? "Initial AI claim corrected" : hadBlocker(r) ? "Original AI claim unresolved" : "—";
