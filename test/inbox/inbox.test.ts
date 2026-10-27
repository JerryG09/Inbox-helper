import { describe, expect, it } from "vitest";
import type { ValidMessage } from "@/lib/domain/types";
import { SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyOutcomes, applyParseError, beginProcessing, initialImportState, markProcessing } from "@/lib/import/state";
import {
  clearFilters, filtered, grouped, initialInboxView, nextPending, resolveSelection, selectRecord, setAttentionOnly,
  setProcessFilter, setReviewFilter, showFailedQueue, stats, viewAfterReveal,
} from "@/lib/inbox/inbox";
import { exactFixtureId, simulateBatch, simulateOutcome } from "@/lib/processing/mock";
import { applyOutcome, toQueuedRecords } from "@/lib/processing/processor";

async function revealed(rows = SAMPLE_ROWS) {
  const queued = beginProcessing(applyImport(initialImportState, rows, "x"));
  const handed = markProcessing(queued);
  return applyOutcomes(handed, await simulateBatch(queued.valid));
}

const msg = (over: Partial<ValidMessage>): ValidMessage => ({ key: "k", importedId: "M001", candidateName: "Ada Okafor", subject: "Interview change", message: SAMPLE_ROWS[0]!.message, sourceRow: 2, ...over });

describe("processing status and counts", () => {
  it("queued → processing → completed/failed, with total = queued + processing + completed + failed at every step", async () => {
    const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS, "x"));
    const h = markProcessing(q);
    const d = applyOutcomes(h, await simulateBatch(q.valid));
    for (const [s, exp] of [[q, { queued: 6 }], [h, { processing: 6 }], [d, { completed: 5, failed: 1 }]] as const) {
      const st = stats(s.records);
      expect(st.total).toBe(st.queued + st.processing + st.completed + st.failed);
      expect(st).toMatchObject(exp);
    }
  });
  it("every completed record starts Pending; failed records have no review", async () => {
    const d = await revealed();
    expect(d.records.filter((r) => r.processing === "completed").every((r) => r.review === "pending")).toBe(true);
    expect(d.records.find((r) => r.processing === "failed")!.review).toBeUndefined();
    const st = stats(d.records);
    expect(st.completed).toBe(st.pending + st.approved + st.rejected);
  });
  it("original candidate fields and internal keys are unchanged by processing", async () => {
    const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS, "x"));
    const d = applyOutcomes(markProcessing(q), await simulateBatch(q.valid));
    expect(d.records.map((r) => [r.key, r.importedId, r.candidateName, r.subject, r.message])).toEqual(
      q.records.map((r) => [r.key, r.importedId, r.candidateName, r.subject, r.message]),
    );
  });
  it("an outcome cannot be applied to a different record", () => {
    const [r] = toQueuedRecords([msg({ key: "a" })]);
    expect(() => applyOutcome(r!, { ...simulateOutcome(msg({ key: "b" })) })).toThrow();
  });
});

describe("grouping", () => {
  it("each record appears exactly once; multi-intent M002 is only under its primary", async () => {
    const d = await revealed();
    const g = grouped(d.records);
    const keys = g.flatMap(([, rs]) => rs.map((r) => r.key));
    expect(keys.sort()).toEqual(d.records.map((r) => r.key).sort());
    const m002 = d.records.find((r) => r.importedId === "M002")!;
    expect(m002.secondaryIntents).toEqual(["documentation_technical"]);
    expect(g.filter(([, rs]) => rs.includes(m002)).map(([k]) => k)).toEqual(["Interview scheduling"]);
    expect(g.map(([k]) => k)).toEqual(["Interview scheduling", "Application status", "Failed processing", "Withdrawal"]);
  });
  it("queued records group under Other / unclear (prototype behavior)", () => {
    const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS, "x"));
    expect(grouped(q.records).map(([k, rs]) => [k, rs.length])).toEqual([["Other / unclear", 6]]);
  });
});

describe("fixture isolation", () => {
  it("binds canned output only to the exact synthetic fixture", () => {
    expect(exactFixtureId(msg({}))).toBe("M001");
    expect(simulateOutcome(msg({})).source).toBe("simulated_fixture");
  });
  it.each([
    ["different message", { message: "Please withdraw my application." }],
    ["different name", { candidateName: "Someone Else" }],
    ["missing subject", { subject: undefined }],
  ])("same imported ID with %s gets the labelled fallback, not Ada's output", (_, over) => {
    const o = simulateOutcome(msg(over));
    expect(o.source).toBe("simulated_fallback");
    expect(o.ok && o.summary).toContain("NOT an AI-generated classification");
    expect(o.ok && o.draft).not.toContain("Ada");
  });
  it("no simulated outcome claims to be from Anthropic", async () => {
    const d = await revealed();
    expect(d.records.every((r) => r.outcomeSource !== "anthropic")).toBe(true);
  });
});

describe("filters and selection", () => {
  it("default Pending filter hides the failed record; Failed queue shows only it", async () => {
    const d = await revealed();
    const v = viewAfterReveal(d.records);
    expect(filtered(d.records, v).map((r) => r.importedId)).toEqual(["M001", "M002", "M003", "M004", "M006"]);
    expect(filtered(d.records, showFailedQueue(v)).map((r) => r.importedId)).toEqual(["M005"]);
    expect(setProcessFilter(v, "Failed").reviewFilter).toBe("All");
    expect(filtered(d.records, setAttentionOnly(v, true)).map((r) => r.importedId)).toEqual(["M001", "M002", "M003"]);
    expect(filtered(d.records, setReviewFilter(v, "Approved"))).toEqual([]);
    expect(filtered(d.records, clearFilters(setReviewFilter(v, "Approved")))).toHaveLength(6);
  });
  it("reveal selects the first completed record; hidden selection moves to the first visible", async () => {
    const d = await revealed();
    const v = viewAfterReveal(d.records);
    expect(v.selectedKey).toBe(d.records[0]!.key);
    const failedKey = d.records.find((r) => r.processing === "failed")!.key;
    expect(resolveSelection(filtered(d.records, v), failedKey)).toBe(d.records[0]!.key);
  });
  it("selecting opens mobile detail; filter changes return to the list; records are untouched", async () => {
    const d = await revealed();
    const before = JSON.stringify(d.records);
    const v = selectRecord(initialInboxView, d.records[3]!.key);
    expect(v.mobileDetail).toBe(true);
    expect(setReviewFilter(v, "All").mobileDetail).toBe(false);
    expect(JSON.stringify(d.records)).toBe(before);
  });
  it("Next pending cycles through Pending records", async () => {
    const d = await revealed();
    const v = viewAfterReveal(d.records);
    expect(nextPending(d.records, v)!.selectedKey).toBe(d.records[1]!.key);
    expect(nextPending([], v)).toBeNull();
  });
});

describe("existing data after a failed new import", () => {
  it("a parse error keeps processed records and their outcomes", async () => {
    const d = await revealed();
    expect(applyParseError(d, "CSV has an unclosed quote.").records).toEqual(d.records);
  });
});
