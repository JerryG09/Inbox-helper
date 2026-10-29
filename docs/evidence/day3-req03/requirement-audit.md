# REQ-03A — MUST Option A requirement audit

**Authoritative scope (owner-supplied MUST wording):**
> "An inbox helper takes a pile of candidate messages, groups them by what the person wants, and drafts a short reply for each. A human reviews every draft before it is sent."

**Source audited:** product source `6a23fe2`, which is unchanged through `325caf6` apart from the R1 detector.

**Method:** Claude Code read the cited code, tests and evidence, and wrote this audit. **The verdicts are Claude's recommendations and need owner acceptance.**

Gap classes:
- **CHALLENGE**: required by the MUST wording.
- **OWNER**: an owner-defined constraint.
- **FUTURE**: an optional enhancement.

## Summary verdict

| Clause | Verdict | Blocking gap? |
|---|---|---|
| A. Takes a pile of candidate messages | **Met** (simulated: up to 50; live: up to 10 per run) | No. The 10-message live limit is an OWNER cost constraint that must be disclosed. |
| B. Groups them by what the person wants | **Met** under a defensible interpretation: fixed six-intent taxonomy, one primary group, secondary intents, human correction | No |
| C. Drafts a short reply for each | **Met** for every successfully processed message (5/5 genuine drafts are 45–68 words). Failed messages get no draft, and say so. | No. "Short" is requested in the prompt, not enforced. |
| D. A human reviews every draft before it is sent | **Met.** Every draft starts Pending. Approval is an explicit human action. The app never sends; approved text is retrieved from Review or the CSV. | No. A Copy action is FUTURE. |
| E. AI-first engineering objective | **Strongly evidenced**, with concrete human-over-AI corrections | No |

**No unmet MUST requirement was found.** Two interpretations were examined and rejected as **not** stated by MUST: (1) that categories must be user-created or dynamic, and (2) that the app must itself send replies. See B and D.

## A. "Takes a pile of candidate messages"

| Aspect | Implementation | Code path | Evidence |
|---|---|---|---|
| Intended outcome | A recruiter loads many messages at once instead of handling them one by one | — | — |
| Import methods | CSV upload, manual single-message entry, the 6-message sample, and an invalid-rows sample | `src/components/ImportWorkspace.tsx`, `src/lib/import/validate.ts`, `src/lib/import/sample.ts` | `test/import/import.test.ts`; `test/visual/import-flow.spec.ts`; `docs/evidence/ui-02/` |
| Import limits | 50 messages, 2,000 characters per message, 256 KB file. Invalid rows are shown and excluded. | `validate.ts` `MAX_MESSAGES`, `MAX_MESSAGE_CHARS`, `MAX_FILE_BYTES` | import tests |
| Live processing limit | **10 messages per request**. More than 10 is refused before any model call, and Start is disabled with a warning. Batches are not split automatically. | `live-contract.ts` `MAX_LIVE_MESSAGES`; `handler.ts`; `live-client.ts` | `handler.test.ts`; `live-flow.spec.ts` "over the live limit (11 messages)" |
| Six-message demonstration | The six-message sample covers 4 intents, multi-intent, a blocked draft and a failure + retry. That is a complete minimum journey for a demo, but a small "pile". | `sample.ts` | `docs/evidence/ui-03..05b`; `grouping-validation.md` |

**Gap:** with genuine AI, a pile of 11–50 messages must be split into several imports. This is an **OWNER** constraint for cost and safety, not a MUST requirement.
- **Recommendation:** keep 10 for the challenge and disclose it in the README and demo. Automatic chunking is FUTURE.

## B. "Groups them by what the person wants"

| Question | Finding | Code / evidence |
|---|---|---|
| Is intent classification a defensible reading? | Yes. "What the person wants" is the candidate's request, i.e. intent. Grouping by request type lets a recruiter batch similar replies. | `src/lib/domain/intents.ts`; `docs/intent.md` (owner-approved 27 Oct) |
| Are six categories adequate for the demo? | Yes for typical candidate correspondence: status, interview, role information, documents/technical, withdrawal, other. The Day 1 exploratory run classified 27/30 correctly against AI-drafted labels (not held-out). Day 4 will test this on fresh data. | `eval/runs/…09-27-47…`; Day 4 plan |
| Should categories be user-configurable? | **Not required by MUST.** It would change the prompt, schema, UI and frozen design. **FUTURE.** | — |
| Can a reviewer correct a wrong classification? | Yes. Primary select plus secondary checkboxes; the record regroups and review resets to Pending. | `transitions.ts` `correctPrimary`/`toggleSecondary`; `CandidateReview.tsx`; `grouping-req03.spec.ts` |
| Multi-intent messages | One primary group, with secondary intents shown in the detail panel and exported. The message is never duplicated across groups. | `inbox.ts` `groupKey`; `inbox.test.ts`; `grouping-req03.spec.ts` |
| Is one primary group per message reasonable? | Yes. It gives an unambiguous work queue and counts that reconcile; secondaries preserve the other needs. The trade-off is that a message is not *listed* under its secondary groups. | `grouped()` |
| None of the categories fits | `other_unclear` is a first-class category. It is reviewable and approvable like any other. | `grouping-req03.spec.ts` "out-of-taxonomy" |
| Failed AI processing | A separate "Failed processing" group, with no intent and no review, and explicit retry | `inbox.ts`; `grouping-req03.spec.ts` |

## C. "Drafts a short reply for each"

| Aspect | Finding | Code / evidence |
|---|---|---|
| Prompt instruction | "Plain text only, under 120 words…" | `provider.ts` `SYSTEM_PROMPT` |
| Enforcement | **Requested, not enforced.** The server schema allows up to 1,500 characters (`draft_reply`), and there is no word-count check. | `ModelOutputSchema` |
| Actual length (genuine, n = 5) | 49, 58, 60, 45, 68 words: min 45, max 68, all under 120 | `reply-handoff-audit.md` |
| No valid draft | The record is Failed with a safe reason, has no draft and cannot be approved; failed-only retry is available | `processOne` failure taxonomy; `canApprove` |
| Simulated drafts | Canned V1.1 fixtures, or a labelled generic fallback (NOT AI) | `mock.ts` |

## D. "A human reviews every draft before it is sent"

| Aspect | Finding | Code / evidence |
|---|---|---|
| Review | Every completed record starts Pending. The draft is editable, and the original AI draft is preserved separately. | `applyOutcome`; `transitions.ts` |
| Explicit approval | Only the "Approve draft" action approves. Editing, rechecking or correcting never approves, and any later edit resets to Pending. | `approveDraft`; `transitions.test.ts`; `hiring-claims.test.ts` |
| Approval vs sending | Approval records a decision only. The UI announces "Draft approval recorded. No message was sent." There is no send path. | `review-flow.spec.ts`; `app-shell.test.tsx` "contains no send path" |
| Retrieving the approved reply | (1) Review detail: the draft editor shows the approved text. (2) Results + CSV: the `reviewed_draft` column, alongside `original_ai_draft` | `export-csv.ts`; `results-export.test.ts`; `live-flow.spec.ts` |
| Copy action | Not present. It would cut handoff friction (see `reply-handoff-audit.md`). **FUTURE**, needing an approved UI exception. | — |
| Why sending is absent | MUST says "before it is sent". It requires review to precede sending, not that this tool sends. Sending would need email/ATS integration, authentication and real candidate data, all of which are excluded by the owner-approved intent. | `docs/intent.md`; README |

## E. AI-first objective — how delegation changed the work

| Example | AI role | Human judgment |
|---|---|---|
| Day 1 Run 1: 30/30 requests failed | Claude built the harness. It used a deprecated `temperature` parameter, and an environment mismatch selected the wrong model. | The failed run was kept in `eval/runs/`, and the closeout's stated cause was later corrected in a separate commit (`0eef60e`). Run 2 succeeded after the fix. |
| v0.2 labels | Claude drafted the labels and proposed adjudications | The owner accepted them but required disclosure that they were post-hoc, which is why a fresh held-out set is needed (`docs/intent.md`) |
| UX-04-01 | Claude reproduced the approved design exactly | Review found a mobile dead end; the owner authorised a recorded exception (`628f85d`) |
| AI-01 R1/R2 (P0) | Claude's first detector passed its own tests | Architect review found an unverified-offer bypass, then three more false negatives. Both were fixed with mutation testing (`7d1c0f0`, `9d34948`). |
| AI-02 → R1 | Claude's adversarial matrix found R-REJ | The architect authorised a narrowly scoped fix and deferred everything else (`611b383`) |
| REQ-03 (this slice) | — | The owner challenged whether the architecture meets the original wording at all; this audit is the response |

**Evidence strength:**
- **Strong:** dated commits, accepted gates, before/after reproductions, mutation results.
- **Weaker:** model quality has been measured only on an exploratory set and 5 genuine calls. Day 4's held-out evaluation is the main remaining evidence gap.
