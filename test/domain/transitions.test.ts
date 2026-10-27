import { describe, expect, it } from "vitest";
import {
  approveDraft, blockerResolved, canApprove, correctPrimary, editDraft, hadBlocker, recheckDraft, rejectDraft, toggleSecondary, updateRecord,
} from "@/lib/domain/transitions";
import type { InboxRecord } from "@/lib/domain/types";
import { SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyOutcomes, beginProcessing, initialImportState } from "@/lib/import/state";
import { filtered, grouped, initialInboxView, stats } from "@/lib/inbox/inbox";
import { simulateBatch } from "@/lib/processing/mock";
import { BLOCKED_FINDING } from "@/lib/processing/processor";

async function batch() {
  const q = beginProcessing(applyImport(initialImportState, SAMPLE_ROWS, "x"));
  return applyOutcomes(q, await simulateBatch(q.valid)).records;
}
const byId = (rs: InboxRecord[], id: string) => rs.find((r) => r.importedId === id)!;
const SAFE = "Hi Sarah, thanks for your message. We will ask the recruitment team for an update on your application.";

describe("classification correction", () => {
  it("primary correction regroups the record exactly once and resets review", async () => {
    const rs = await batch();
    const m4 = byId(rs, "M004");
    const next = updateRecord(rs, m4.key, (r) => correctPrimary(approveDraft(r), "job_information"));
    const groups = grouped(next);
    expect(groups.filter(([, g]) => g.some((r) => r.key === m4.key)).map(([k]) => k)).toEqual(["Job information"]);
    expect(byId(next, "M004").review).toBe("pending");
  });
  it("promoting a secondary keeps the former primary as secondary (M002 swap)", async () => {
    const m2 = byId(await batch(), "M002");
    const swapped = correctPrimary(m2, "documentation_technical");
    expect(swapped.primaryIntent).toBe("documentation_technical");
    expect(swapped.secondaryIntents).toEqual(["interview_scheduling"]);
    const back = correctPrimary(swapped, "interview_scheduling");
    expect([back.primaryIntent, back.secondaryIntents]).toEqual(["interview_scheduling", ["documentation_technical"]]);
  });
  it("choosing a non-secondary primary keeps existing secondaries", async () => {
    const m2 = byId(await batch(), "M002");
    expect(correctPrimary(m2, "withdrawal").secondaryIntents).toEqual(["documentation_technical"]);
  });
  it("adds and removes secondaries; never the primary; resets review", async () => {
    const m1 = approveDraft(byId(await batch(), "M001"));
    const added = toggleSecondary(m1, "job_information", true);
    expect([added.secondaryIntents, added.review]).toEqual([["job_information"], "pending"]);
    expect(toggleSecondary(added, "job_information", false).secondaryIntents).toEqual([]);
    expect(toggleSecondary(added, "interview_scheduling", true)).toBe(added);
  });
  it("never changes the original candidate message", async () => {
    const m2 = byId(await batch(), "M002");
    const after = editDraft(toggleSecondary(correctPrimary(m2, "withdrawal"), "job_information", true), "x");
    expect(after.message).toBe(SAMPLE_ROWS[1]!.message);
  });
});

describe("draft review", () => {
  it("edit → approve → edit → Pending; original AI draft preserved", async () => {
    const m1 = byId(await batch(), "M001");
    const approved = approveDraft(editDraft(m1, "Hi Ada, could you share two alternative times?"));
    expect(approved.review).toBe("approved");
    const edited = editDraft(approved, "Hi Ada, could you share alternative times?");
    expect(edited.review).toBe("pending");
    expect(edited.originalAiDraft).toBe(m1.originalAiDraft);
  });
  it("reject → edit → Pending; reject means draft rejected only", async () => {
    const m4 = byId(await batch(), "M004");
    const rejected = rejectDraft(m4);
    expect(rejected.review).toBe("rejected");
    expect(rejected.processing).toBe("completed");
    expect(editDraft(rejected, "New text").review).toBe("pending");
  });
  it("empty or whitespace draft cannot be approved", async () => {
    const m4 = byId(await batch(), "M004");
    for (const t of ["", "   \n"]) {
      const e = editDraft(m4, t);
      expect(canApprove(e)).toBe(false);
      expect(approveDraft(e).review).toBe("pending");
    }
  });
  it("warnings stay visible and do not block approval", async () => {
    const m1 = byId(await batch(), "M001");
    expect(m1.attention).toBe("warning");
    expect(canApprove(m1)).toBe(true);
    expect(approveDraft(m1).currentAttentionReasons).toEqual(["Interview availability not verified"]);
  });
  it("failed records cannot be approved or rejected", async () => {
    const m5 = byId(await batch(), "M005");
    expect(approveDraft(m5)).toBe(m5);
    expect(rejectDraft(m5)).toBe(m5);
  });
});

describe("safety transitions (M003 unsupported hiring claim)", () => {
  it("blocked on arrival; original claim and historical finding preserved", async () => {
    const m3 = byId(await batch(), "M003");
    expect([m3.attention, canApprove(m3), hadBlocker(m3)]).toEqual(["blocked", false, true]);
    expect(m3.originalAiDraft).toContain("You have been hired");
    expect(m3.historicalAiFindings).toEqual([BLOCKED_FINDING]);
  });
  it("editing alone does not clear the blocker", async () => {
    const e = editDraft(byId(await batch(), "M003"), SAFE);
    expect([e.attention, canApprove(e)]).toEqual(["blocked", false]);
  });
  it("recheck fails for the unchanged draft and for listed phrases", async () => {
    const m3 = byId(await batch(), "M003");
    expect(recheckDraft(m3).passed).toBe(false);
    expect(recheckDraft(editDraft(m3, "Good news, you're hired!")).passed).toBe(false);
    expect(recheckDraft(editDraft(m3, "  ")).passed).toBe(false);
  });
  it("corrected draft + explicit recheck + explicit approval", async () => {
    const m3 = byId(await batch(), "M003");
    const { record, passed } = recheckDraft(editDraft(m3, SAFE));
    expect(passed).toBe(true);
    expect([record.attention, record.review, blockerResolved(record), canApprove(record)]).toEqual(["none", "pending", true, true]);
    expect(record.historicalAiFindings).toEqual([BLOCKED_FINDING]);
    expect(record.originalAiDraft).toBe(m3.originalAiDraft);
    expect(approveDraft(record).review).toBe("approved");
  });
  it("any later edit re-activates the blocker; reintroduced unsafe wording cannot be approved or rechecked", async () => {
    const ok = approveDraft(recheckDraft(editDraft(byId(await batch(), "M003"), SAFE)).record);
    const unsafe = editDraft(ok, SAFE + " Your application has been accepted.");
    expect([unsafe.attention, unsafe.review, canApprove(unsafe), recheckDraft(unsafe).passed]).toEqual(["blocked", "pending", false, false]);
    expect(unsafe.currentAttentionReasons).toContain("Unsupported hiring decision");
  });
});

describe("batch invariants", () => {
  it("counts reconcile and other records are untouched by a change", async () => {
    const rs = await batch();
    const m1 = byId(rs, "M001");
    let next = updateRecord(rs, m1.key, approveDraft);
    next = updateRecord(next, byId(rs, "M004").key, rejectDraft);
    const s = stats(next);
    expect(s.total).toBe(s.queued + s.processing + s.completed + s.failed);
    expect(s.completed).toBe(s.pending + s.approved + s.rejected);
    expect([s.approved, s.rejected, s.pending]).toEqual([1, 1, 3]);
    next.filter((r) => !["M001", "M004"].includes(r.importedId)).forEach((r) => expect(rs).toContain(r));
  });
  it("Approved filter: an edited approved item leaves the Approved list", async () => {
    const rs = await batch();
    const m1 = byId(rs, "M001");
    const approved = updateRecord(rs, m1.key, approveDraft);
    const v = { ...initialInboxView, reviewFilter: "Approved" as const };
    expect(filtered(approved, v).map((r) => r.importedId)).toEqual(["M001"]);
    const edited = updateRecord(approved, m1.key, (r) => editDraft(r, "x"));
    expect(filtered(edited, v)).toEqual([]);
    expect(filtered(edited, { ...v, reviewFilter: "Pending" }).map((r) => r.importedId)).toContain("M001");
  });
});
