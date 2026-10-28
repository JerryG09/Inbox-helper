// AI-01 R1 (P0): the shared deterministic unsupported-hiring-claim detector. One detector serves the provider's
// server-side check, canApprove() and recheckDraft(). Limited safeguard: unknown phrasings remain a human-review duty.
import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approveDraft, canApprove, editDraft, hadBlocker, recheckDraft } from "@/lib/domain/transitions";
import type { InboxRecord } from "@/lib/domain/types";
import { forbiddenDraft } from "@/lib/inbox/inbox";
import { exportRow, EXPORT_COLUMNS } from "@/lib/export/export-csv";
import { simulateOutcome } from "@/lib/processing/mock";
import { applyOutcome, BLOCKED_FINDING, UNSUPPORTED_HIRING_FLAG, toQueuedRecords } from "@/lib/processing/processor";
import { processOne, type CreateMessage } from "@/lib/processing/provider";
import { SAMPLE_ROWS } from "@/lib/import/sample";

// Affirmative hiring / selection / offer claims: every one must be detected.
export const UNSAFE = [
  "Congratulations, we are pleased to offer you the Customer Support role.", // R1 case A
  "You have been selected for the position.", // R1 case B
  "We would like to offer you the Customer Support role.",
  "We'd like to offer you the job, starting next month.",
  "We are delighted to offer you a position on the team.",
  "We're happy to extend an offer to you.",
  "We have made you an offer for the role.",
  "Your offer has been confirmed.",
  "An offer is being prepared for you.",
  "Your offer letter is on its way.",
  "We are preparing your offer letter now.",
  "You've been shortlisted for the final stage.",
  "You were selected from a strong field of applicants.",
  "You’re selected for the Customer Support role.", // typographic apostrophe
  "We have decided to hire you.",
  "You are now employed by the company.",
  "Good news: you've got the job!",
  "Your application has been successful.",
  "You have been successful in your application.",
  "Your application has been accepted.",
  "Welcome to the team! Your start date is Monday.",
  "Don't worry, you have been hired.",
  "Hi Ada, thanks for your patience. You are hired.",
  // V1.1 list, must remain detected
  "Congratulations! You have been hired and your offer letter is being prepared.",
  "Good news, you're hired!",
  "Your offer of employment is attached.",
];

// Cautious recruiter wording: negation, questions, hypotheticals and future conditionals must stay approvable.
export const SAFE = [
  "We cannot confirm any hiring decision or offer at this time.",
  "No offer has been made.",
  "Your application is still under review.",
  "The recruitment team will review your application.",
  "We cannot confirm that you have been selected.",
  "Please contact the recruitment team for an update.",
  "Thank you for asking about the salary offered for this role.",
  "We will let you know if you are shortlisted.",
  "If you are selected, the recruitment team will contact you.",
  "Once an offer is made, you will receive it in writing.",
  "We are unable to confirm whether you have been selected.",
  "Have you been offered another role elsewhere?",
  "Were you selected for an interview at another company?",
  "We are unable to confirm any hiring outcome or offer through this channel.",
  "Shortlisted candidates will be contacted by the recruitment team.",
  "The team has not made any hiring decision yet.",
  "We can't say whether an offer will be made.",
  "Hi Sarah, we will ask the recruitment team for an update.",
];

describe("detector: affirmative claims are detected", () => {
  for (const s of UNSAFE) it(`blocks: ${s}`, () => expect(forbiddenDraft(s)).toBe(true));
});

describe("detector: cautious wording is not blocked (false-positive controls)", () => {
  for (const s of SAFE) it(`allows: ${s}`, () => expect(forbiddenDraft(s)).toBe(false));
  it("all four genuine AI-01 drafts remain unblocked", () => {
    const obs = JSON.parse(readFileSync("docs/evidence/ai-01/live-acceptance-observations.json", "utf8")).observed as { draft: string }[];
    expect(obs).toHaveLength(4);
    for (const o of obs) expect(forbiddenDraft(o.draft)).toBe(false);
  });
});

const out = (draft: string, flag: boolean) => ({ primary_intent: "application_status", secondary_intents: [], summary: "Asks about outcome.", draft_reply: draft, attention_reasons: [], unsupported_hiring_decision: flag });
const create = (body: unknown): CreateMessage => async () => ({
  message: { id: "msg_r1", model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(body) }], usage: { input_tokens: 1, output_tokens: 1 } } as unknown as Anthropic.Message,
  requestId: null,
});
const rec = { key: "b1:r2", importedId: "R1", candidateName: "Ada Test", subject: "Outcome", message: "Did I get the job?" };

describe("provider: the model's boolean never overrides a deterministic finding", () => {
  for (const draft of [UNSAFE[0]!, UNSAFE[1]!, UNSAFE[2]!]) {
    it(`flag false + "${draft}" → blocked with the unsupported-hiring reason`, async () => {
      const o = await processOne(rec, "m", create(out(draft, false)));
      expect(o).toMatchObject({ ok: true, blocked: true });
      if (o.ok) expect(o.attentionReasons[0]).toBe(UNSUPPORTED_HIRING_FLAG);
    });
  }
  it("flag true on a safe-looking draft → still blocked (model finding respected)", async () => {
    const o = await processOne(rec, "m", create(out("Thanks, the team will be in touch.", true)));
    expect(o).toMatchObject({ ok: true, blocked: true });
  });
  it("flag false + cautious draft → not blocked, no hiring reason", async () => {
    const o = await processOne(rec, "m", create(out(SAFE[0]!, false)));
    expect(o).toMatchObject({ ok: true, blocked: false, attentionReasons: [] });
  });
});

describe("review lifecycle with the shared detector", () => {
  it("blocked → edit (still blocked) → unsafe recheck fails → safe recheck passes → explicit approval; history preserved; CSV distinguishes", async () => {
    const o = await processOne(rec, "m", create(out(UNSAFE[0]!, false)));
    const [queued] = toQueuedRecords([{ key: rec.key, importedId: rec.importedId, candidateName: rec.candidateName, subject: rec.subject, message: rec.message, sourceRow: 2 }]);
    let r: InboxRecord = applyOutcome({ ...queued!, processing: "processing" }, o);
    expect(r.attention).toBe("blocked");
    expect(r.historicalAiFindings).toEqual([BLOCKED_FINDING]);
    expect(canApprove(r)).toBe(false);

    r = editDraft(r, "Hi Ada, we would like to offer you the job."); // edited but still unsafe
    expect(hadBlocker(r) && r.needsRecheck && r.attention === "blocked").toBe(true);
    expect(canApprove(r)).toBe(false);
    const failed = recheckDraft(r);
    expect(failed.passed).toBe(false);
    expect(failed.record).toBe(r);

    r = editDraft(r, "Hi Ada, we cannot confirm any hiring decision or offer at this time. The recruitment team will follow up.");
    expect(canApprove(r)).toBe(false); // editing alone does not clear the blocker
    const passed = recheckDraft(r);
    expect(passed.passed).toBe(true);
    expect(passed.record.review).toBe("pending"); // recheck never approves
    r = approveDraft(passed.record);
    expect(r.review).toBe("approved");
    expect(r.originalAiDraft).toBe(UNSAFE[0]);
    expect(r.historicalAiFindings).toEqual([BLOCKED_FINDING]);

    const row = Object.fromEntries(EXPORT_COLUMNS.map((c, i) => [c, exportRow(r)[i]]));
    expect(row.review_status).toBe("Approved");
    expect(row.original_ai_draft).toBe(UNSAFE[0]);
    expect(row.reviewed_draft).toContain("cannot confirm");
    expect(row.historical_ai_findings).toContain(BLOCKED_FINDING);
    expect(row.current_attention_state).not.toBe("Blocked");
  });

  it("canApprove() independently rejects an unsafe current draft even without a blocker", () => {
    const [q] = toQueuedRecords([{ key: "b1:r3", importedId: "S1", message: "Is it remote?", sourceRow: 3 }]);
    const ok = applyOutcome({ ...q!, processing: "processing" }, { key: "b1:r3", ok: true, source: "anthropic", primaryIntent: "job_information", secondaryIntents: [], summary: "s", draft: "Thanks.", attentionReasons: [], blocked: false });
    expect(canApprove(ok)).toBe(true);
    expect(canApprove(editDraft(ok, "You have been selected for the position."))).toBe(false);
    expect(canApprove(editDraft(ok, "We are pleased to offer you the role."))).toBe(false);
  });

  it("existing M003 simulated fixture is unchanged: blocked, unapprovable", () => {
    const m3row = SAMPLE_ROWS.find((r) => r.id === "M003")!;
    const [q] = toQueuedRecords([{ key: "b1:r4", importedId: "M003", candidateName: m3row.candidate_name, subject: m3row.subject, message: m3row.message, sourceRow: 4 }]);
    const r = applyOutcome({ ...q!, processing: "processing" }, simulateOutcome({ key: "b1:r4", importedId: "M003", candidateName: m3row.candidate_name, subject: m3row.subject, message: m3row.message, sourceRow: 4 }));
    expect(r.outcomeSource).toBe("simulated_fixture");
    expect(r.attention).toBe("blocked");
    expect(canApprove(r)).toBe(false);
  });
});

// AI-01 R2 (P0): three independently reproduced false negatives in the R1 detector.
import { containsHiringClaim } from "@/lib/safety/hiring-claims";
export const R2_UNSAFE = [
  "Not only have we decided to hire you.", // R2-A: "not only" is not a negation
  "We cannot confirm that you have been selected, but you have been selected.", // R2-B: later occurrence
  "You have been selected, okay?", // R2-C: declarative claim + tag question
];
export const R2_SAFE = [
  "We cannot confirm that you have been selected.",
  "No offer has been made.",
  "If you are selected, we will contact you.",
  "Once an offer is made, you will receive it in writing.",
  "Have you been offered another position?",
  "Were you selected for an interview elsewhere?",
  "You have been selected?",
];

describe("R2: reproduced false negatives are blocked on every safety path", () => {
  for (const s of R2_UNSAFE) {
    it(`containsHiringClaim + forbiddenDraft block: ${s}`, () => {
      expect(containsHiringClaim(s)).toBe(true);
      expect(forbiddenDraft(s)).toBe(true);
    });
    it(`processOne (flag false) → blocked; canApprove false; recheck fails; history and Pending preserved: ${s}`, async () => {
      const o = await processOne(rec, "m", create(out(s, false)));
      expect(o).toMatchObject({ ok: true, blocked: true });
      if (o.ok) expect(o.attentionReasons[0]).toBe(UNSUPPORTED_HIRING_FLAG);
      const [queued] = toQueuedRecords([{ key: rec.key, importedId: rec.importedId, candidateName: rec.candidateName, subject: rec.subject, message: rec.message, sourceRow: 2 }]);
      let r: InboxRecord = applyOutcome({ ...queued!, processing: "processing" }, o);
      expect(r.attention).toBe("blocked");
      expect(r.review).toBe("pending");
      expect(r.originalAiDraft).toBe(s);
      expect(r.historicalAiFindings).toEqual([BLOCKED_FINDING]);
      expect(canApprove(r)).toBe(false);
      r = editDraft(r, `Hi Ada. ${s}`); // edited but still unsafe
      expect(canApprove(r)).toBe(false);
      const failed = recheckDraft(r);
      expect(failed.passed).toBe(false);
      expect(failed.record.review).toBe("pending");
      expect(failed.record.originalAiDraft).toBe(s);
      expect(failed.record.historicalAiFindings).toEqual([BLOCKED_FINDING]);
    });
  }
});

describe("R2: negative controls stay approvable", () => {
  for (const s of R2_SAFE) it(`allows: ${s}`, () => {
    expect(containsHiringClaim(s)).toBe(false);
    expect(forbiddenDraft(s)).toBe(false);
  });
});
