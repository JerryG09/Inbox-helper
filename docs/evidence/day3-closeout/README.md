# Day 3 closeout index — 29 October 2026

**Status:** `DAY_3_ENGINEERING_AND_EVIDENCE_ACCEPTED_PENDING_MERGE`.
- **Not merged.** `main` = `6a23fe281e45769ae10bd00872b823ecb97dd2de`.
- **Integration pending** a separate fast-forward authorisation.

## Acceptance chain
The chain runs linearly from `6a23fe2`: 9 commits, no merges, fast-forwardable.

| Step | SHA | Decision |
|---|---|---|
| Starting `main` | `6a23fe281e45769ae10bd00872b823ecb97dd2de` | Day 2 accepted baseline |
| AI-02 qualification + EVIDENCE-03 | `47ca9c7bcdefa6701c83d318cba2d55deed0ab19` | Architect accepted |
| AI-02 R1 (code, then evidence) | `611b383e4dc3f3aa0f07ffbe6216cc91610128be` → `325caf699f423c66538ecf2112fbbc09215555f3` | Architect accepted |
| REQ-03 | `da22c804b4860b8289d810ebca4c5a80804a616c` → `02e81cf11d55560834dbbcedb9e7dc1ee7f975b3` | Architect accepted; owner approved P1–P6 |
| UI-06A | `9c22541e0b11f71130e6a7746fd91f08191e9f59` → `4c501c42cafe38ba6f3a6bf9952c9b0bc6ef5658` | Technical implementation accepted |
| UI-06A R1 | `fb1a45384d3bb157003ce2fbde0439163011fc95` → `66e535d2de1e21fae126d7e91c3e904037bf8b2b` | `UI06A_R1_FOCUS_PARITY_ACCEPTED` |
| Owner visual sign-off of UX-A11Y-01/02/03 | recorded in this closeout | `OWNER_VISUALLY_ACCEPTED` (29 Oct 2026) |
| Day 3 final closeout (documentation only) | child of `66e535d` on `day3/final-evidence-closeout`; SHA reported in the closeout report | Pending closeout review |

## Evidence map

| Topic | Location |
|---|---|
| AI-02 qualification matrix | [../day3-ai02/qualification-matrix.md](../day3-ai02/qualification-matrix.md) |
| Real SDK HTTP tests | [../../../test/live/provider-http.test.ts](../../../test/live/provider-http.test.ts) |
| Adversarial safety findings | [../day3-ai02/safety-findings.md](../day3-ai02/safety-findings.md), [../../../test/live/adversarial-safety.test.ts](../../../test/live/adversarial-safety.test.ts) |
| Genuine performance notes (n = 5) | [../day3-ai02/performance-notes.md](../day3-ai02/performance-notes.md) |
| AI-02 R1 before/fix evidence | [../day3-ai02-r1/README.md](../day3-ai02-r1/README.md), [../day3-ai02-r1/before-fix-reproduction.txt](../day3-ai02-r1/before-fix-reproduction.txt) |
| REQ-03 requirement audit | [../day3-req03/requirement-audit.md](../day3-req03/requirement-audit.md) |
| Grouping tests | [../day3-req03/grouping-validation.md](../day3-req03/grouping-validation.md), [../../../test/visual/grouping-req03.spec.ts](../../../test/visual/grouping-req03.spec.ts) |
| Reply/handoff audit and product decisions | [../day3-req03/reply-handoff-audit.md](../day3-req03/reply-handoff-audit.md), [../day3-req03/product-decisions-proposed.md](../day3-req03/product-decisions-proposed.md) |
| Held-out dataset preparation | [../../../eval/heldout/day4-candidate-messages-v1.json](../../../eval/heldout/day4-candidate-messages-v1.json), [../../evaluation/day4-label-adjudication.md](../../evaluation/day4-label-adjudication.md), [../../evaluation/day4-evaluation-plan.md](../../evaluation/day4-evaluation-plan.md) |
| UI-06A focus evidence | [../day3-ui06a/README.md](../day3-ui06a/README.md), [../day3-ui06a/focus-measurements.md](../day3-ui06a/focus-measurements.md), [../day3-ui06a/visual-exceptions.md](../day3-ui06a/visual-exceptions.md) |
| UI-06A R1 parity diagnosis | [../day3-ui06a-r1/README.md](../day3-ui06a-r1/README.md), [../day3-ui06a-r1/diff-localization.json](../day3-ui06a-r1/diff-localization.json) |
| Day 3 daily log | [../../daily-log/2026-10-29-day3.md](../../daily-log/2026-10-29-day3.md) |
| Unlearning observations | [../../unlearning/day3-observations.md](../../unlearning/day3-observations.md) |
| Submission evidence index / manifest | [../../submission/evidence-index.md](../../submission/evidence-index.md), [../../submission/submission-manifest.md](../../submission/submission-manifest.md) |
| Day 4 handoff | [../../day4-handoff-2026-10-30.md](../../day4-handoff-2026-10-30.md) |

## Verification summary (Claude-run; not independently re-executed)

| Slice | Result |
|---|---|
| AI-02 R1 | Unit 330 = 321 passed + 9 expected-failure safety pins. Playwright 287 = 286 passed + 1 expected-failure (A11Y-02). Parity 212/212. |
| REQ-03 | Grouping 4/4. Held-out set prepared and **not evaluated**. |
| UI-06A | Unit 321 + 9 expected-fail. Full Playwright **301 = 277 passed + 24 parity failures**: focus-state differences, owner-accepted as exceptions, **not** a full pass under the historical parity rules. Original harness 188/212 at 0 px. Supplementary classification 24/24. Accessibility spec 10/10. |
| UI-06A R1 | 72/72. Reference + UI-06A CSS = 0 px in all 24 cases. No production change. |
| Mutations | AI-02: M1–M4 killed. AI-02 R1: the "moving forward" rule removal was caught. UI-06A: the CSS focus rule and `aria-labelledby` removals were caught. |
| Paid calls | **0** in Day 3 |

## Limitations (open at closeout)

**Safety:**
- **KL-1, KL-2, KL-3:** known hiring-detector false negatives.
- **R-INJ:** prompt-injection phrasings that are not flagged.
- **R-WD:** completed-withdrawal phrasings that are not flagged.
- **R-PII:** no deterministic check on third-party data.
- **F-HIST:** co-occurring AI reasons are not kept in blocked history.
- **Rejection phrasings beyond R-REJ's five corrected cases** are still possible false negatives.
- 9 expected-failure safety pins remain.

**Accessibility:**
- **A11Y-04:** the frozen button/link focus ring is 2.79:1.
- "Review status" label semantics.
- Screen readers, Safari and Firefox are untested.
- Zoom/reflow and forced colours are untested.
- **No WCAG 2.2 AA conformance is established.**

**Operations:**
- Ten messages per genuine live request.
- Importing a new file replaces the current batch.
- The concurrency ceiling applies per HTTP request, not globally.
- The local-only Anthropic endpoint has no production authentication.
- No server-side persistent state.
- No message sending, by design.

**Model evaluation:**
- Only five genuine integrated messages have been accepted.
- The 30 held-out labels are `AI_PROPOSED_UNVERIFIED`, and the dataset is `NOT_FROZEN`.
- No held-out evaluation result exists yet.
