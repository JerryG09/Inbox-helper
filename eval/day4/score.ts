// EVAL-04C scoring, implementing docs/evidence/day4-eval04c/evaluation-protocol.md (pre-registered in Phase A).
// Pure: reference labels are read here only, after predictions exist; nothing in this file reaches a provider.
import { INTENT_IDS } from "../../src/lib/domain/intents";
import type { FrozenItem, ItemOutcome } from "./harness";

export const SCORING_VERSION = "day4-protocol-v1";
// Server-added flags are fixed literals in src/lib/processing/provider.ts / processor.ts (copied, not imported: that
// module is server-only). A literal match shows the flag is present; it cannot prove the model did not also say it.
export const SERVER_FLAGS = [
  "Unsupported hiring decision",
  "Message contains instructions aimed at the AI (treated as untrusted data)",
  "Draft may imply the withdrawal is already done; verify wording",
];
export const PRICE = { inputPerMTok: 0.1, outputPerMTok: 0.5, source: "https://platform.claude.com/docs/en/about-claude/pricing (Claude Haiku 5.5, prompts <= 100K tokens)" };

export type Pred = { primary: string; secondary: string[]; attention: boolean; reasons: string[]; blocked?: boolean; draft?: string };
type Meta = { inputTokens: number | null; outputTokens: number | null; latencyMs: number; model: string | null; stopReason: string | null; code: string } | undefined;

const ratio = (num: number, den: number) => ({ num, den, value: den ? Math.round((num / den) * 1000) / 1000 : null });
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };

export function predFromOutcome(o: ItemOutcome): Pred | null {
  if (o.kind !== "completed") return null;
  const r = o.raw as { primaryIntent: string; secondaryIntents: string[]; attentionReasons: string[]; blocked: boolean; draft: string };
  return { primary: r.primaryIntent, secondary: r.secondaryIntents.filter((i) => i !== r.primaryIntent), attention: r.attentionReasons.length > 0 || r.blocked, reasons: r.attentionReasons, blocked: r.blocked, draft: r.draft };
}

export function score(items: readonly FrozenItem[], preds: ReadonlyMap<string, Pred | null>) {
  const N = items.length;
  const done = items.filter((i) => preds.get(i.id));
  const C = done.length;
  const P = (i: FrozenItem) => preds.get(i.id)!;
  const strict = done.filter((i) => P(i).primary === i.reference_label.primary_intent);
  const lenient = done.filter((i) => [i.reference_label.primary_intent, ...i.reference_label.acceptable_alternative_primary].includes(P(i).primary));
  const confusion: Record<string, Record<string, number>> = {};
  for (const r of INTENT_IDS) { confusion[r] = Object.fromEntries([...INTENT_IDS, "not_completed"].map((c) => [c, 0])); }
  for (const i of items) confusion[i.reference_label.primary_intent]![preds.get(i.id)?.primary ?? "not_completed"]!++;
  const perCategory = Object.fromEntries(INTENT_IDS.map((k) => {
    const ref = done.filter((i) => i.reference_label.primary_intent === k);
    return [k, ratio(ref.filter((i) => P(i).primary === k).length, ref.length)];
  }));
  let tp = 0, predN = 0, refN = 0;
  for (const i of done) { const ps = new Set(P(i).secondary), rs = new Set(i.reference_label.secondary_intents); predN += ps.size; refN += rs.size; for (const x of ps) if (rs.has(x)) tp++; }
  const sp = ratio(tp, predN), sr = ratio(tp, refN);
  const f1 = sp.value !== null && sr.value !== null && sp.value + sr.value > 0 ? Math.round(((2 * sp.value * sr.value) / (sp.value + sr.value)) * 1000) / 1000 : null;
  const multi = items.filter((i) => i.reference_label.secondary_intents.length > 0);
  const multiDone = multi.filter((i) => preds.get(i.id));
  const ouRef = done.filter((i) => i.reference_label.primary_intent === "other_unclear");
  const nonOu = done.filter((i) => i.reference_label.primary_intent !== "other_unclear");
  const att = (sig: (p: Pred) => boolean) => {
    const tpIds = done.filter((i) => i.reference_label.needs_attention && sig(P(i))).map((i) => i.id);
    const fpIds = done.filter((i) => !i.reference_label.needs_attention && sig(P(i))).map((i) => i.id);
    const fnIds = done.filter((i) => i.reference_label.needs_attention && !sig(P(i))).map((i) => i.id);
    return { recall: ratio(tpIds.length, tpIds.length + fnIds.length), precision: ratio(tpIds.length, tpIds.length + fpIds.length), falsePositives: fpIds, falseNegatives: fnIds };
  };
  return {
    scoringVersion: SCORING_VERSION, N, completed: C,
    completion: ratio(C, N),
    strictPrimary: { overCompleted: ratio(strict.length, C), overAll: ratio(strict.length, N), misses: done.filter((i) => !strict.includes(i)).map((i) => i.id) },
    lenientPrimary: { overCompleted: ratio(lenient.length, C), overAll: ratio(lenient.length, N), rescuedByAlternative: lenient.filter((i) => !strict.includes(i)).map((i) => i.id) },
    confusion, perCategoryRecall: perCategory,
    secondary: { precision: sp, recall: sr, f1, truePositives: tp },
    multiIntent: { n: multi.length, completed: multiDone.length, strictPrimary: ratio(multiDone.filter((i) => P(i).primary === i.reference_label.primary_intent).length, multiDone.length),
      perItem: multi.map((i) => ({ id: i.id, ref: i.reference_label.secondary_intents, pred: preds.get(i.id)?.secondary ?? null })) },
    otherUnclear: { correct: ratio(ouRef.filter((i) => P(i).primary === "other_unclear").length, ouRef.length), falsePositives: nonOu.filter((i) => P(i).primary === "other_unclear").map((i) => i.id), fpRate: ratio(nonOu.filter((i) => P(i).primary === "other_unclear").length, nonOu.length) },
    attentionProduct: att((p) => p.attention),
    attentionServerFlagPresent: att((p) => p.reasons.some((r) => SERVER_FLAGS.includes(r))),
    attentionDiscretionaryRefs: ["H010", "H026", "H030"],
  };
}

export function draftStats(items: readonly FrozenItem[], preds: ReadonlyMap<string, Pred | null>) {
  const rows = items.flatMap((i) => { const p = preds.get(i.id); return p?.draft !== undefined ? [{ id: i.id, words: words(p.draft), blocked: !!p.blocked, serverFlags: p.reasons.filter((r) => SERVER_FLAGS.includes(r)) }] : []; });
  const w = rows.map((r) => r.words);
  return { rows, n: rows.length, minWords: w.length ? Math.min(...w) : null, medianWords: median(w), maxWords: w.length ? Math.max(...w) : null,
    under120: ratio(w.filter((x) => x < 120).length, w.length), blocked: rows.filter((r) => r.blocked).map((r) => r.id) };
}

export function ops(outcomes: readonly ItemOutcome[]) {
  const metas = outcomes.flatMap((o) => ("raw" in o ? [(o.raw as { meta?: Meta }).meta] : [])).filter((m): m is NonNullable<Meta> => !!m);
  const inTok = metas.reduce((a, m) => a + (m.inputTokens ?? 0), 0), outTok = metas.reduce((a, m) => a + (m.outputTokens ?? 0), 0);
  const lat = metas.map((m) => m.latencyMs);
  const byKind: Record<string, number> = {}; const failures: Record<string, string[]> = {};
  for (const o of outcomes) {
    byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
    if (o.kind === "provider_failure" || o.kind === "unassessable") (failures[o.code] ??= []).push(o.id);
  }
  return {
    providerAttemptsWithMeta: metas.length, byKind, failuresByCode: failures,
    models: [...new Set(metas.map((m) => m.model))], stopReasons: [...new Set(metas.map((m) => m.stopReason))],
    tokens: { input: inTok, output: outTok, nullInput: metas.filter((m) => m.inputTokens === null).length, nullOutput: metas.filter((m) => m.outputTokens === null).length },
    latencyMs: { min: lat.length ? Math.min(...lat) : null, median: median(lat), max: lat.length ? Math.max(...lat) : null },
    estimatedCostUsd: Math.round(((inTok * PRICE.inputPerMTok + outTok * PRICE.outputPerMTok) / 1e6) * 1e6) / 1e6,
  };
}
