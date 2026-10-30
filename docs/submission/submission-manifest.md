# MUST submission manifest — seven required deliverables

**Last updated:** 29 Oct 2026, end of Day 3. Day 3 is `DAY_3_ENGINEERING_AND_EVIDENCE_ACCEPTED_PENDING_MERGE`, so `main` is still `6a23fe2`. The first version of this manifest is in commit `47ca9c7`.

**Current state (30 Oct 2026, Day 4 Phase A):** Day 3 is merged, so `main` = `1991ec0`; the Day 3 note above is historical. Day 4 is OPEN on three separate, unintegrated branches (EVAL-04B `8fb8da1`, EVAL-04C `08b77e4`, Phase A accessibility); see `docs/evidence/day4-eval04a/README.md`. Item 5: the Day 4 log exists on the EVAL-04B branch.

**Final repository SHA:** not yet recorded (Day 5).

**Status values:**
- `COMPLETE`
- `IN_PROGRESS`
- `DRAFT_EXISTS`
- `AVAILABLE`
- `PLANNED`
- `MISSING`

**Nothing here is final until the Day 5 independent submission review. The seven-item submission is not complete.**

| # | Deliverable | Status | Canonical path / URL | Supporting evidence | Outstanding actions | Target day | Final verification |
|---|---|---|---|---|---|---|---|
| 1 | Loom walkthrough of the AI-native engineering process | **NOT RECORDED** (PLANNED) | none yet | `recording-shotlist.md` Recording 1; `evidence-index.md` | Record after the Day 4 evidence; check the link is accessible | Day 5 | Not verified |
| 2 | `intent.md` | **AVAILABLE** (owner-approved 27 Oct) | `docs/intent.md` | `1bffd94`; REQ-03 requirement audit (`02e81cf`) | Final accuracy review against the shipped product; decide whether the canonical copy moves to the repo root | Day 5 | Not verified |
| 3 | `Final directive.md` | **NOT PREPARED** (MISSING) | — | Day 1–3 directives as recorded in the daily logs | Author it and agree its scope with the owner | Day 5 | Not verified |
| 4 | Working code and accurate README | **AVAILABLE**; README update outstanding | `JerryG09/Inbox-helper`. `main` = `6a23fe2`; Day 3 is accepted on `day3/final-evidence-closeout` but not merged | Day 1–3 accepted evidence | Fast-forward integration of Day 3 (owner authorisation). README limitations: R-REJ scope and residual risks, per-request concurrency, local-only endpoint, 10-message live limit, accessibility exceptions and A11Y-04. Record the final SHA. | Day 5 | Not verified |
| 5 | Five dated daily logs | **IN_PROGRESS: 3 of 5 exist** | `docs/daily-log/` | Day 1 and Day 2 complete; Day 3 (`2026-10-29-day3.md`) accepted, pending merge | Day 4 and Day 5 logs | Day 5 | Not verified |
| 6 | Five-minute working product demonstration | **NOT RECORDED** (PLANNED) | none yet | `recording-shotlist.md` Recording 2. It separates genuine Anthropic evidence, the local fake provider and simulation. | Record; label provenance on screen; state that nothing is auto-sent | Day 5 | Not verified |
| 7 | One-page unlearning note | **NOT FINALISED** (source notes only) | final note: none yet | `docs/unlearning/day1-observations.md`, `docs/unlearning/day3-observations.md` (5 observations), Day 2 lessons in `docs/daily-log/2026-10-28-day2.md` | Synthesise into one page after Day 4 | Day 5 | Not verified |

**Gate reminder (Evidence Contract §G):**
- All seven items exist and are accessible.
- The final SHA is recorded.
- Demo claims match the product.
- Safety, evaluation and accessibility limitations are disclosed.
- Links are checked.
- No secrets or real candidate data.
- Independent review has passed.
