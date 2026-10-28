import { describe, expect, it } from "vitest";
import { correctPrimary, editDraft, approveDraft, recheckDraft, rejectDraft, toggleSecondary, updateRecord } from "@/lib/domain/transitions";
import type { RawRow } from "@/lib/domain/types";
import { SAMPLE_ROWS } from "@/lib/import/sample";
import {
  applyImport, beginProcessing, cancelProcessing, failOperation, initialImportState, resetState, settleOperation, startOperation, type ImportState,
} from "@/lib/import/state";
import { grouped, groupKey, stats } from "@/lib/inbox/inbox";
import { controlledAdapter, simulateBatch, simulateOutcome, simulateRetry, simulateRetryOutcome, type SimPlan } from "@/lib/processing/mock";
import { MAX_DIAGNOSTICS, reconcile, type Operation } from "@/lib/processing/operation";
import type { ProcessBatch, ProcessOutcome } from "@/lib/processing/processor";

// Pure equivalent of the page's runOperation(): start → adapter → settle against the state current at settlement.
async function run(s: ImportState, kind: "batch" | "retry", keys: readonly string[], adapter: ProcessBatch) {
  const { state, op } = startOperation(s, kind, keys);
  if (!op) return { state, op };
  const targets = new Set(op.keys);
  try {
    return { state: settleOperation(state, op.id, await adapter(state.valid.filter((m) => targets.has(m.key)))), op };
  } catch {
    return { state: failOperation(state, op.id), op };
  }
}
const queued = (rows: readonly RawRow[] = SAMPLE_ROWS, from = initialImportState) => beginProcessing(applyImport(from, rows, "x"));
const allKeys = (s: ImportState) => s.records.map((r) => r.key);
const failedKeys = (s: ImportState) => s.records.filter((r) => r.processing === "failed").map((r) => r.key);
const byId = (s: ImportState, id: string) => s.records.find((r) => r.importedId === id)!;
async function revealed(rows: readonly RawRow[] = SAMPLE_ROWS, adapter: ProcessBatch = simulateBatch) {
  const q = queued(rows);
  return (await run(q, "batch", allKeys(q), adapter)).state;
}

// Every count/grouping invariant from the slice brief; called after each transition.
function assertInvariants(s: ImportState, expectedKeys?: readonly string[]) {
  const st = stats(s.records);
  expect(st.total).toBe(st.queued + st.processing + st.completed + st.failed);
  expect(st.completed).toBe(st.pending + st.approved + st.rejected);
  const keys = s.records.map((r) => r.key);
  expect(new Set(keys).size).toBe(keys.length);
  if (expectedKeys) expect(keys).toEqual(expectedKeys);
  expect(grouped(s.records).reduce((n, [, rs]) => n + rs.length, 0)).toBe(s.records.length);
  for (const r of s.records) {
    expect(grouped(s.records).filter(([, rs]) => rs.includes(r))).toHaveLength(1);
    if (r.processing === "completed") expect(r.review).toBeDefined();
    if (r.processing === "failed") expect(r.error?.code).toBeTruthy();
  }
}

const synth = (n: number): RawRow[] =>
  Array.from({ length: n }, (_, i) => ({ id: `S${String(i + 1).padStart(3, "0")}`, candidate_name: `Synthetic Person ${i + 1}`, subject: "Synthetic enquiry", message: `Synthetic message ${i + 1}: is the role remote?` }));

describe("I1–I4 reconciliation", () => {
  const op = (keys: string[]): Operation => ({ id: 7, kind: "batch", keys });
  const processing = (s: ImportState) => startOperation(s, "batch", allKeys(s)).state;

  it("1. all valid outcomes reconcile: every target completed/pending or failed, nothing else", async () => {
    const d = await revealed();
    assertInvariants(d);
    expect(stats(d.records)).toMatchObject({ completed: 5, pending: 5, failed: 1, processing: 0 });
    expect(d.activeOp).toBeNull();
    expect(d.diagnostics).toEqual([]);
  });

  it("2. a missing outcome becomes an explicit, retryable failure — never stuck in processing", async () => {
    const q = queued();
    const plan: SimPlan = { [q.records[1]!.key]: ["missing"] };
    const d = (await run(q, "batch", allKeys(q), controlledAdapter(simulateOutcome, plan))).state;
    expect(d.records[1]).toMatchObject({ processing: "failed", error: { code: "missing_outcome" } });
    expect(stats(d.records).processing).toBe(0);
    expect(d.diagnostics).toContainEqual({ opId: 1, code: "missing_outcome", count: 1 });
    assertInvariants(d);
  });

  it("3. duplicate outcomes for one key fail that target instead of first/last-wins", async () => {
    const q = queued();
    const key = q.records[0]!.key;
    const d = (await run(q, "batch", allKeys(q), controlledAdapter(simulateOutcome, { [key]: ["duplicate"] }))).state;
    const r = d.records[0]!;
    expect(r).toMatchObject({ processing: "failed", error: { code: "duplicate_outcome" } });
    expect(r.primaryIntent).toBeUndefined();
    expect(r.currentDraft).toBeUndefined();
    expect(r.aiSummary).toBeUndefined();
    expect(d.records.slice(1).every((x) => x.processing !== "processing")).toBe(true);
    assertInvariants(d);
  });

  it("4. an outcome for a key outside the operation mutates nothing and is recorded content-free", () => {
    const s = processing(queued());
    const recs = s.records;
    const stray: ProcessOutcome = { ...simulateOutcome(s.valid[0]!), key: "b999:r2" };
    const { records, diagnostics } = reconcile(recs, op([recs[0]!.key]), [simulateOutcome(s.valid[0]!), stray]);
    expect(records).toHaveLength(recs.length);
    expect(records.find((r) => r.key === "b999:r2")).toBeUndefined();
    expect(records.slice(1).every((r, i) => r === recs[i + 1])).toBe(true); // same objects
    expect(diagnostics).toEqual([{ opId: 7, code: "unexpected_outcome", count: 1 }]);
    expect(JSON.stringify(diagnostics)).not.toMatch(/Ada|interview|message/i);
  });

  it("4b. an outcome cannot re-target a record via a forged importedId", () => {
    const s = processing(queued());
    const forged = { ...simulateOutcome(s.valid[0]!), key: s.records[0]!.importedId };
    const { records } = reconcile(s.records, op([s.records[0]!.key]), [forged]);
    expect(records[0]).toMatchObject({ processing: "failed", error: { code: "missing_outcome" } });
  });

  it("5. mixed success/failure batch settles every target", async () => {
    const q = queued();
    const [a, b, c] = q.records.map((r) => r.key);
    const d = (await run(q, "batch", allKeys(q), controlledAdapter(simulateOutcome, { [a!]: ["fail"], [b!]: ["missing"], [c!]: ["duplicate"] }))).state;
    expect(d.records.slice(0, 3).map((r) => r.error?.code)).toEqual(["simulated_timeout", "missing_outcome", "duplicate_outcome"]);
    expect(stats(d.records)).toMatchObject({ completed: 2, failed: 4, processing: 0, queued: 0 });
    assertInvariants(d);
  });

  it("6. adapter throws/rejects: every target settles as Failed; the processing view closes", async () => {
    const q = queued();
    const d1 = (await run(q, "batch", allKeys(q), controlledAdapter(simulateOutcome, { [q.records[2]!.key]: ["throw"] }))).state;
    expect(d1.records.every((r) => r.processing === "failed" && r.error?.code === "adapter_exception")).toBe(true);
    expect(d1.processing).toBe(false);
    expect(d1.activeOp).toBeNull();
    const d2 = (await run(q, "batch", allKeys(q), () => Promise.reject(new Error("x")))).state;
    expect(stats(d2.records).failed).toBe(6);
    assertInvariants(d2);
  });
});

describe("I5 stale and overlapping operations", () => {
  it("7. a result arriving after reset is ignored", async () => {
    const q = queued();
    const { state, op } = startOperation(q, "batch", allKeys(q));
    const outcomes = await simulateBatch(state.valid);
    const afterReset = resetState(state);
    const late = settleOperation(afterReset, op!.id, outcomes);
    expect(late.records).toEqual([]);
    expect(late.diagnostics.at(-1)).toEqual({ opId: op!.id, code: "stale_result", count: 1 });
  });

  it("8. a result from an older import cannot mutate a newer batch, even when internal keys collide after reset", async () => {
    const q = queued();
    const { state, op } = startOperation(q, "batch", allKeys(q));
    const outcomes = await simulateBatch(state.valid);
    const newer = startOperation(queued(SAMPLE_ROWS, state), "batch", []).state; // new import replaces the batch
    expect(settleOperation(newer, op!.id, outcomes).records).toBe(newer.records);
    // Keys are never reused after reset: importSeq survives.
    const reimported = queued(SAMPLE_ROWS, resetState(state));
    expect(reimported.records[0]!.key).not.toBe(state.records[0]!.key);
    const newerOp = startOperation(reimported, "batch", allKeys(reimported));
    expect(newerOp.op!.id).toBeGreaterThan(op!.id);
    expect(settleOperation(newerOp.state, op!.id, outcomes).records).toBe(newerOp.state.records);
    expect(cancelProcessing(state).activeOp).toBeNull();
  });

  it("8b. an old retry result arriving after a newer transition (human edit) keeps the edit and settles only its target", async () => {
    const d = await revealed();
    const m005 = byId(d, "M005").key, ada = byId(d, "M001").key;
    const { state, op } = startOperation(d, "retry", [m005]);
    const outcomes = await simulateRetry(state.valid.filter((m) => m.key === m005));
    const edited = { ...state, records: updateRecord(state.records, ada, (r) => approveDraft(editDraft(r, "Hi Ada, edited."))) };
    const settled = settleOperation(edited, op!.id, outcomes);
    expect(byId(settled, "M001")).toBe(byId(edited, "M001"));
    expect(byId(settled, "M001")).toMatchObject({ review: "approved", currentDraft: "Hi Ada, edited." });
    expect(byId(settled, "M005").processing).toBe("completed");
    // A second (duplicate) completion of the same operation is stale.
    const again = settleOperation(settled, op!.id, outcomes);
    expect(again.records).toBe(settled.records);
    expect(again.diagnostics.at(-1)!.code).toBe("stale_result");
  });

  it("9. repeated retry clicks do not duplicate work: overlapping starts are refused", async () => {
    const d = await revealed();
    const m005 = byId(d, "M005").key;
    const first = startOperation(d, "retry", [m005]);
    expect(first.op).not.toBeNull();
    expect(startOperation(first.state, "retry", [m005]).op).toBeNull();
    expect(startOperation(first.state, "retry", failedKeys(d)).op).toBeNull();
    let calls = 0;
    const counting: ProcessBatch = async (ms) => { calls += ms.length; return simulateRetry(ms); };
    const [x, y] = await Promise.all([run(d, "retry", [m005], counting), run(first.state, "retry", [m005], counting)]);
    expect(calls).toBe(1);
    expect(x.op).not.toBeNull();
    expect(y.op).toBeNull();
  });

  it("9b. while one retry is in flight, a retry of a DIFFERENT failed record (or Retry failed) is refused, not run concurrently", async () => {
    const q = queued();
    const d = (await run(q, "batch", allKeys(q), controlledAdapter(simulateOutcome, { [q.records[0]!.key]: ["fail"] }))).state;
    const [a, b] = failedKeys(d);
    const inFlight = startOperation(d, "retry", [a!]);
    expect(startOperation(inFlight.state, "retry", [b!]).op).toBeNull();
    expect(startOperation(inFlight.state, "retry", failedKeys(inFlight.state)).op).toBeNull();
    expect(inFlight.state.records.find((r) => r.key === b)!.processing).toBe("failed");
  });

  it("diagnostics are bounded", () => {
    let s = initialImportState;
    for (let i = 0; i < MAX_DIAGNOSTICS + 5; i++) s = settleOperation(s, i, []);
    expect(s.diagnostics).toHaveLength(MAX_DIAGNOSTICS);
  });
});

describe("failed-only retry", () => {
  it("10. non-failed records cannot be retried", async () => {
    const d = await revealed();
    for (const id of ["M001", "M003", "M004"]) expect(startOperation(d, "retry", [byId(d, id).key]).op).toBeNull();
    const approved = { ...d, records: updateRecord(d.records, byId(d, "M004").key, approveDraft) };
    expect(startOperation(approved, "retry", [byId(d, "M004").key]).op).toBeNull();
    expect(startOperation(d, "retry", ["no-such-key"]).op).toBeNull();
    const mixed = startOperation(d, "retry", allKeys(d));
    expect(mixed.op!.keys).toEqual([byId(d, "M005").key]);
  });

  it("11. a failed retry remains Failed and recoverable", async () => {
    const d = await revealed();
    const m005 = byId(d, "M005").key;
    const plan: SimPlan = { [m005]: ["fail", "throw"] };
    const adapter = controlledAdapter(simulateRetryOutcome, plan);
    const r1 = (await run(d, "retry", [m005], adapter)).state;
    expect(byId(r1, "M005")).toMatchObject({ processing: "failed", error: { code: "simulated_timeout" } });
    const r2 = (await run(r1, "retry", [m005], adapter)).state;
    expect(byId(r2, "M005")).toMatchObject({ processing: "failed", error: { code: "adapter_exception" } });
    const r3 = (await run(r2, "retry", [m005], adapter)).state;
    expect(byId(r3, "M005").processing).toBe("completed");
    for (const s of [r1, r2, r3]) assertInvariants(s, allKeys(d));
  });

  it("12. a successful retry is Completed/Pending with the approved V1.1 simulated recovery, error cleared", async () => {
    const d = await revealed();
    const r = byId((await run(d, "retry", [byId(d, "M005").key], simulateRetry)).state, "M005");
    expect(r).toMatchObject({
      processing: "completed", review: "pending", error: undefined, primaryIntent: "documentation_technical", secondaryIntents: [], attention: "none",
      aiSummary: "Candidate reports a resume upload issue. Mock retry succeeded.", outcomeSource: "simulated_fixture",
    });
    expect(r.currentDraft).toBe(r.originalAiDraft);
    expect(r.currentDraft).toMatch(/^Hi Fatima, sorry you experienced an upload problem/);
    expect(groupKey(r)).toBe("Documentation / technical");
  });

  it("retry input is reconstructed from the validated message; the canned recovery needs the exact fixture, not the id", async () => {
    const collision: RawRow[] = [{ id: "M005", candidate_name: "Someone Else", subject: "Resume upload", message: "Different text." }];
    const d = await revealed(collision, controlledAdapter(simulateOutcome, { "b1:r2": ["fail"] }));
    const r = (await run(d, "retry", failedKeys(d), simulateRetry)).state.records[0]!;
    expect(r.outcomeSource).toBe("simulated_fallback");
    expect(r.aiSummary).not.toMatch(/Mock retry succeeded/);
  });

  it("13/14. retry changes only targeted keys; Approved-edited, Rejected, corrected multi-intent and rechecked M003 stay identical", async () => {
    let d = await revealed();
    const k = (id: string) => byId(d, id).key;
    d = { ...d, records: updateRecord(d.records, k("M001"), (r) => approveDraft(editDraft(r, "Hi Ada, a human rewrote this."))) };
    d = { ...d, records: updateRecord(d.records, k("M004"), rejectDraft) };
    d = { ...d, records: updateRecord(d.records, k("M002"), (r) => toggleSecondary(correctPrimary(r, "documentation_technical"), "job_information", true)) };
    d = { ...d, records: updateRecord(d.records, k("M003"), (r) => recheckDraft(editDraft(r, "Hi Sarah, we will ask the team for an update.")).record) };
    const before = new Map(d.records.map((r) => [r.key, r]));
    const snapshot = structuredClone(d.records);
    const after = (await run(d, "retry", failedKeys(d), simulateRetry)).state;

    for (const r of after.records) if (r.key !== k("M005")) expect(r).toBe(before.get(r.key)); // same object, untouched
    expect(after.records.filter((r) => r.key !== k("M005"))).toEqual(snapshot.filter((r) => r.key !== k("M005")));
    expect(byId(after, "M001")).toMatchObject({ review: "approved", currentDraft: "Hi Ada, a human rewrote this." });
    expect(byId(after, "M001").originalAiDraft).toMatch(/Could you share some alternative times\?/);
    expect(byId(after, "M004").review).toBe("rejected"); // the DRAFT was rejected, not the candidate
    expect(byId(after, "M002")).toMatchObject({ primaryIntent: "documentation_technical", secondaryIntents: ["interview_scheduling", "job_information"] });
    expect(byId(after, "M003")).toMatchObject({ attention: "none", needsRecheck: false, historicalAiFindings: ["Initial AI output asserted unsupported hiring decision"] });
    expect(byId(after, "M003").originalAiDraft).toMatch(/You have been hired/);
    assertInvariants(after, allKeys(d));
  });

  it("15. counts and grouping reconcile through start → settle for single and all-failed retry", async () => {
    const d = await revealed();
    assertInvariants(d);
    const started = startOperation(d, "retry", failedKeys(d));
    assertInvariants(started.state);
    expect(stats(started.state.records)).toMatchObject({ processing: 1, failed: 0, completed: 5 });
    const done = settleOperation(started.state, started.op!.id, await simulateRetry(started.state.valid.filter((m) => started.op!.keys.includes(m.key))));
    assertInvariants(done);
    expect(stats(done.records)).toMatchObject({ completed: 6, pending: 6, failed: 0 });
  });
});

describe("synthetic 30-message batch: 27 succeed, 3 fail, then targeted retry", () => {
  it("retrying the 3 failures leaves the other 27 records and all human changes untouched", async () => {
    const rows = synth(30);
    const q = queued(rows);
    const keys = allKeys(q);
    const failing: string[] = [keys[4]!, keys[17]!, keys[29]!];
    // Initial: 3 fail. Retry 1: one recovers, one fails again, one missing. Retry 2: the remaining two recover.
    const plan: SimPlan = { [failing[0]!]: ["fail"], [failing[1]!]: ["fail", "fail"], [failing[2]!]: ["fail", "missing"] };
    let s = (await run(q, "batch", keys, controlledAdapter(simulateOutcome, plan))).state;
    expect(stats(s.records)).toMatchObject({ total: 30, completed: 27, failed: 3 });
    assertInvariants(s, keys);

    const others = keys.filter((k) => !failing.includes(k));
    s = { ...s, records: updateRecord(s.records, others[0]!, (r) => approveDraft(editDraft(r, "Edited and approved."))) };
    s = { ...s, records: updateRecord(s.records, others[1]!, rejectDraft) };
    s = { ...s, records: updateRecord(s.records, others[2]!, (r) => correctPrimary(r, "withdrawal")) };
    const frozen = structuredClone(s.records.filter((r) => others.includes(r.key)));
    const objects = s.records.filter((r) => others.includes(r.key));

    const retry = controlledAdapter(simulateRetryOutcome, plan);
    let calls = 0;
    const counted: ProcessBatch = async (ms) => { calls += ms.length; return retry(ms); };
    s = (await run(s, "retry", failedKeys(s), counted)).state;
    expect(calls).toBe(3);
    expect(stats(s.records)).toMatchObject({ completed: 28, failed: 2 });
    expect(s.records.find((r) => r.key === failing[2])!.error?.code).toBe("missing_outcome");
    assertInvariants(s, keys);

    s = (await run(s, "retry", failedKeys(s), counted)).state;
    expect(calls).toBe(5); // only the two still-failed records were retried
    expect(stats(s.records)).toMatchObject({ total: 30, completed: 30, failed: 0, approved: 1, rejected: 1, pending: 28 });
    assertInvariants(s, keys);
    expect(s.records.filter((r) => others.includes(r.key))).toEqual(frozen);
    s.records.filter((r) => others.includes(r.key)).forEach((r, i) => expect(r).toBe(objects[i]));
  });
});
