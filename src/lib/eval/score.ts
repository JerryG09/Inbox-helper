import type { Classification, IntentId } from "../domain/intents";

export type EvalItem = {
  id: string;
  category: "straightforward" | "ambiguous" | "multi_intent" | "adversarial";
  candidate_name?: string;
  subject?: string;
  message: string;
  expected_primary: IntentId;
  // v0.2+: other primaries a reviewer accepts as equally correct (expected_primary is always accepted).
  acceptable_primary?: IntentId[];
  expected_secondary: IntentId[];
  expected_attention: boolean;
};

// `null` output means no usable classification was produced. `errorKind` says why.
export type ErrorKind = "truncated" | "processing_failure";
export type Prediction = { id: string; output: Classification | null; error?: string; errorKind?: ErrorKind };

export type RowStatus = "completed" | ErrorKind | "missing";

// Scoring v2 (DAY1-02 R1). Unavailable responses are processing outcomes, never attention decisions:
// - primary/intent metrics are over ALL items (an unavailable response is not a correct classification);
// - attention metrics are over COMPLETED items only; unavailable ones are counted as `attentionUnassessable`.
export const SCORING_VERSION = "v2";

export function score(items: EvalItem[], predictions: Prediction[]) {
  const byId = new Map(predictions.map((p) => [p.id, p]));
  const rows = items.map((item) => {
    const p = byId.get(item.id);
    const out = p?.output ?? null;
    const status: RowStatus = !p ? "missing" : out ? "completed" : (p.errorKind ?? "processing_failure");
    const accepted = new Set([item.expected_primary, ...(item.acceptable_primary ?? [])]);
    const predictedAll = out ? new Set([out.primary_intent, ...out.secondary_intents]) : new Set<IntentId>();
    const expectedAll = [item.expected_primary, ...item.expected_secondary];
    return {
      id: item.id,
      category: item.category,
      status,
      error: p?.error,
      primaryCorrect: out !== null && accepted.has(out.primary_intent),
      // Multi-intent recall: share of expected intents present anywhere in the prediction.
      intentRecall: out ? expectedAll.filter((i) => predictedAll.has(i)).length / expectedAll.length : 0,
      // Attention outcome is only defined for completed rows.
      attention: out === null ? null : out.needs_attention === item.expected_attention ? "correct" : item.expected_attention ? "missed" : "false_alarm",
    } as const;
  });

  const summarize = (subset: typeof rows) => {
    const n = subset.length;
    const completed = subset.filter((r) => r.status === "completed");
    const ratio = (num: number, den: number) => (den ? +(num / den).toFixed(3) : null);
    return {
      n,
      completed: completed.length,
      truncated: subset.filter((r) => r.status === "truncated").length,
      processingFailures: subset.filter((r) => r.status === "processing_failure").length,
      missing: subset.filter((r) => r.status === "missing").length,
      primaryAccuracy: ratio(subset.filter((r) => r.primaryCorrect).length, n),
      primaryAccuracyCompleted: ratio(completed.filter((r) => r.primaryCorrect).length, completed.length),
      meanIntentRecall: ratio(subset.reduce((s, r) => s + r.intentRecall, 0), n),
      attentionAccuracyCompleted: ratio(completed.filter((r) => r.attention === "correct").length, completed.length),
      missedAttention: completed.filter((r) => r.attention === "missed").length,
      falseAlarmAttention: completed.filter((r) => r.attention === "false_alarm").length,
      attentionUnassessable: n - completed.length,
    };
  };

  const categories = ["straightforward", "ambiguous", "multi_intent", "adversarial"] as const;
  return {
    scoringVersion: SCORING_VERSION,
    overall: summarize(rows),
    byCategory: Object.fromEntries(categories.map((c) => [c, summarize(rows.filter((r) => r.category === c))])),
    rows,
  };
}
