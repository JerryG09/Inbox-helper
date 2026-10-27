import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyBaseline } from "@/lib/classify/baseline";
import { ClassificationSchema, INTENTS, IntentIdSchema } from "@/lib/domain/intents";
import { score, type EvalItem } from "@/lib/eval/score";

const dataset = JSON.parse(readFileSync("eval/dataset/v0.1.json", "utf8")) as { synthetic: boolean; items: EvalItem[] };

describe("intent taxonomy", () => {
  it("has exactly six intents including other_unclear", () => {
    expect(INTENTS).toHaveLength(6);
    expect(INTENTS.map((i) => i.id)).toContain("other_unclear");
  });
});

describe("ClassificationSchema", () => {
  const ok = { primary_intent: "withdrawal", secondary_intents: [], needs_attention: false, attention_reasons: [], summary: "Wants to withdraw." };
  it("accepts a valid object", () => expect(ClassificationSchema.safeParse(ok).success).toBe(true));
  it("rejects unknown intents", () => expect(ClassificationSchema.safeParse({ ...ok, primary_intent: "hired" }).success).toBe(false));
  it("rejects extra keys", () => expect(ClassificationSchema.safeParse({ ...ok, reply: "You are hired" }).success).toBe(false));
  it("rejects primary repeated in secondary", () =>
    expect(ClassificationSchema.safeParse({ ...ok, secondary_intents: ["withdrawal"] }).success).toBe(false));
});

describe("evaluation dataset", () => {
  it("is synthetic, has unique ids, valid labels and all four categories", () => {
    expect(dataset.synthetic).toBe(true);
    expect(new Set(dataset.items.map((i) => i.id)).size).toBe(dataset.items.length);
    for (const i of dataset.items) {
      expect(IntentIdSchema.safeParse(i.expected_primary).success).toBe(true);
      i.expected_secondary.forEach((s) => expect(IntentIdSchema.safeParse(s).success).toBe(true));
    }
    expect(new Set(dataset.items.map((i) => i.category))).toEqual(new Set(["straightforward", "ambiguous", "multi_intent", "adversarial"]));
  });
});

describe("baseline + scoring", () => {
  it("baseline output always satisfies the schema and is deterministic", () => {
    for (const i of dataset.items) {
      const a = classifyBaseline(i);
      expect(ClassificationSchema.safeParse(a).success).toBe(true);
      expect(classifyBaseline(i)).toEqual(a);
    }
  });
  it("counts a null output as a failure, never as correct", () => {
    const r = score(dataset.items.slice(0, 2), [{ id: dataset.items[0]!.id, output: null, error: "x" }]);
    expect(r.overall.processingFailures).toBe(1);
    expect(r.overall.missing).toBe(1);
    expect(r.overall.primaryAccuracy).toBe(0);
  });
});
