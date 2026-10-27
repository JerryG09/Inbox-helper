import type { Classification, IntentId } from "../domain/intents";

export type EvalItem = {
  id: string;
  category: "straightforward" | "ambiguous" | "multi_intent" | "adversarial";
  candidate_name?: string;
  subject?: string;
  message: string;
  expected_primary: IntentId;
  expected_secondary: IntentId[];
  expected_attention: boolean;
};

// One prediction per item; `null` output means the classifier failed (network, schema, refusal) for that item.
export type Prediction = { id: string; output: Classification | null; error?: string };

export function score(items: EvalItem[], predictions: Prediction[]) {
  const byId = new Map(predictions.map((p) => [p.id, p]));
  const rows = items.map((item) => {
    const out = byId.get(item.id)?.output ?? null;
    const predictedAll = out ? new Set([out.primary_intent, ...out.secondary_intents]) : new Set<IntentId>();
    const expectedAll = [item.expected_primary, ...item.expected_secondary];
    return {
      id: item.id,
      category: item.category,
      failed: out === null,
      primaryCorrect: out?.primary_intent === item.expected_primary,
      // Multi-intent recall: share of expected intents present anywhere in the prediction.
      intentRecall: expectedAll.filter((i) => predictedAll.has(i)).length / expectedAll.length,
      attentionCorrect: out !== null && out.needs_attention === item.expected_attention,
      missedAttention: item.expected_attention && out?.needs_attention !== true,
    };
  });

  const summarize = (subset: typeof rows) => {
    const n = subset.length || 1;
    return {
      n: subset.length,
      failures: subset.filter((r) => r.failed).length,
      primaryAccuracy: +(subset.filter((r) => r.primaryCorrect).length / n).toFixed(3),
      meanIntentRecall: +(subset.reduce((s, r) => s + r.intentRecall, 0) / n).toFixed(3),
      attentionAccuracy: +(subset.filter((r) => r.attentionCorrect).length / n).toFixed(3),
      missedAttention: subset.filter((r) => r.missedAttention).length,
    };
  };

  const categories = ["straightforward", "ambiguous", "multi_intent", "adversarial"] as const;
  return {
    overall: summarize(rows),
    byCategory: Object.fromEntries(categories.map((c) => [c, summarize(rows.filter((r) => r.category === c))])),
    rows,
  };
}
