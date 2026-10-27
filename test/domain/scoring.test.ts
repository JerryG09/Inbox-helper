import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Classification } from "@/lib/domain/intents";
import { interpret } from "@/lib/eval/interpret";
import { score, type EvalItem } from "@/lib/eval/score";

const item = (over: Partial<EvalItem> & { id: string }): EvalItem => ({
  category: "straightforward",
  message: "synthetic",
  expected_primary: "application_status",
  expected_secondary: [],
  expected_attention: false,
  ...over,
});
const out = (over: Partial<Classification> = {}): Classification => ({
  primary_intent: "application_status",
  secondary_intents: [],
  needs_attention: false,
  attention_reasons: [],
  summary: "s",
  ...over,
});
const validJson = JSON.stringify(out());

describe("interpret(): truncation is a distinct failure", () => {
  it("stop_reason max_tokens → truncated, even when the text happens to parse", () => {
    const p = interpret({ id: "A", stopReason: "max_tokens", text: validJson });
    expect(p).toMatchObject({ output: null, errorKind: "truncated", error: "truncated_max_tokens" });
  });
  it("cut-off JSON with max_tokens → truncated, not invalid_json", () => {
    expect(interpret({ id: "A", stopReason: "max_tokens", text: '{"primary_intent": "withd' }).errorKind).toBe("truncated");
  });
  it("re-interprets an old record that was labelled invalid_json but stopped at max_tokens", () => {
    expect(interpret({ id: "A", error: "invalid_json", stopReason: "max_tokens", text: "{" }).errorKind).toBe("truncated");
  });
  it("end_turn with broken JSON → processing_failure invalid_json", () => {
    expect(interpret({ id: "A", stopReason: "end_turn", text: "{" })).toMatchObject({ errorKind: "processing_failure", error: "invalid_json" });
  });
  it("API error → processing_failure carrying the API message", () => {
    expect(interpret({ id: "A", error: "invalid_request_error: x" })).toMatchObject({ errorKind: "processing_failure", error: "invalid_request_error: x" });
  });
  it("schema violation → processing_failure schema_validation_failed", () => {
    const p = interpret({ id: "A", stopReason: "end_turn", text: JSON.stringify({ ...out(), primary_intent: "hired" }) });
    expect(p).toMatchObject({ errorKind: "processing_failure", error: "schema_validation_failed" });
  });
  it("valid end_turn output → completed", () => {
    expect(interpret({ id: "A", stopReason: "end_turn", text: validJson }).output).toEqual(out());
  });
});

describe("score(): unavailable responses are not attention decisions", () => {
  const items = [item({ id: "T", expected_attention: true }), item({ id: "M", expected_attention: true }), item({ id: "C", expected_attention: true })];
  const r = score(items, [
    { id: "T", output: null, error: "truncated_max_tokens", errorKind: "truncated" },
    // "M" has no prediction at all
    { id: "C", output: out({ needs_attention: true }) },
  ]);

  it("classifies row status", () => {
    expect(r.rows.map((x) => x.status)).toEqual(["truncated", "missing", "completed"]);
    expect(r.overall).toMatchObject({ completed: 1, truncated: 1, missing: 1, processingFailures: 0 });
  });
  it("does not count truncated/missing as missed attention", () => {
    expect(r.overall.missedAttention).toBe(0);
    expect(r.overall.attentionUnassessable).toBe(2);
    expect(r.overall.attentionAccuracyCompleted).toBe(1);
    expect(r.rows[0]!.attention).toBeNull();
  });
  it("still counts unavailable responses as not-correct for primary accuracy over all items", () => {
    expect(r.overall.primaryAccuracy).toBe(0.333);
    expect(r.overall.primaryAccuracyCompleted).toBe(1);
  });
  it("attention accuracy is null, not 0, when nothing completed", () => {
    expect(score([item({ id: "X" })], []).overall.attentionAccuracyCompleted).toBeNull();
  });
});

describe("score(): incorrect attention flags", () => {
  const r = score(
    [item({ id: "MISS", expected_attention: true }), item({ id: "FA", expected_attention: false })],
    [{ id: "MISS", output: out({ needs_attention: false }) }, { id: "FA", output: out({ needs_attention: true }) }],
  );
  it("separates missed attention from false alarms", () => {
    expect(r.rows.map((x) => x.attention)).toEqual(["missed", "false_alarm"]);
    expect(r.overall).toMatchObject({ missedAttention: 1, falseAlarmAttention: 1, attentionAccuracyCompleted: 0 });
  });
});

describe("score(): multi-intent", () => {
  const multi = item({ id: "MI", category: "multi_intent", expected_primary: "interview_scheduling", expected_secondary: ["documentation_technical"] });
  it("swapped order: recall 1, primary wrong without acceptable_primary", () => {
    const r = score([multi], [{ id: "MI", output: out({ primary_intent: "documentation_technical", secondary_intents: ["interview_scheduling"] }) }]);
    expect(r.rows[0]).toMatchObject({ primaryCorrect: false, intentRecall: 1 });
  });
  it("swapped order is correct when listed in acceptable_primary", () => {
    const r = score([{ ...multi, acceptable_primary: ["documentation_technical"] }], [{ id: "MI", output: out({ primary_intent: "documentation_technical", secondary_intents: ["interview_scheduling"] }) }]);
    expect(r.rows[0]).toMatchObject({ primaryCorrect: true, intentRecall: 1 });
  });
  it("missing secondary gives partial recall", () => {
    const r = score([multi], [{ id: "MI", output: out({ primary_intent: "interview_scheduling" }) }]);
    expect(r.rows[0]).toMatchObject({ primaryCorrect: true, intentRecall: 0.5 });
  });
});

describe("historical evaluation files", () => {
  it("v0.2 changes only the six adjudicated items relative to v0.1", () => {
    const load = (v: string) => JSON.parse(readFileSync(`eval/dataset/${v}.json`, "utf8")) as { label_status: string; items: (EvalItem & { revision?: string })[] };
    const a = load("v0.1"), b = load("v0.2");
    expect(b.label_status).toBe("owner_confirmed");
    const changed = b.items.filter((x, i) => JSON.stringify(x) !== JSON.stringify(a.items[i])).map((x) => x.id);
    expect(changed).toEqual(["E014", "E016", "E017", "E019", "E020", "E028"]);
    expect(b.items.map((x) => x.message)).toEqual(a.items.map((x) => x.message));
  });
});
