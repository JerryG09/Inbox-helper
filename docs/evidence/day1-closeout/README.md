# MUST Candidate Inbox Helper — Day 1 evidence index

**Date:** Tuesday 27 October 2026 (WAT). **Status:** engineering acceptance complete, documentation closeout prepared. **Engineering baseline:** [`628f85d`](https://github.com/JerryG09/Inbox-helper/commit/628f85d9045bbb10e159afb1b842d7660e9c3ff6) on `day1/ui-04-human-review`. **At acceptance:** `main` still pointed to `1005fe260d03b0ebf9d8fad9b0db67dddd0fdd39`. No merge or deployment.

## Code and UX evidence

| Gate | Accepted commit | Evidence |
|---|---|---|
| UI-00/01 — foundation | `1005fe260d03b0ebf9d8fad9b0db67dddd0fdd39` | `docs/evidence/day1-01/` |
| DAY1-02 — first genuine provider evaluation | `c97ee8d044c15e297cf7241b941a7b4455c7c9bf` | `eval/runs/`, `docs/intent.md` |
| DAY1-02 R1 — corrected scoring | `06b5fae4497ea264d233aeadbb677a2cc299b3c7` | `eval/rescored/`, `docs/evaluation/label-adjudication-v0.2.md` |
| UI-02 — import | `a5b59804ae6038603cc73202c0d33223ebb18ff2` | `docs/evidence/ui-02/` |
| UI-03 — grouped inbox | `b299ad7c1956bcac8fb1a887d914fe665affbd54` | `docs/evidence/ui-03/` |
| UI-04 — human review | `1836dae5a391990f0f726c40a2ba712ad3ce3e5d` | `docs/evidence/ui-04/` |
| UI-04 R1 — owner-authorized mobile recovery | `628f85d9045bbb10e159afb1b842d7660e9c3ff6` | `docs/evidence/ui-04-r1/`, exception **UX-04-01** |

**Latest source-level acceptance:** the review transitions, immutable candidate input, historical original model drafts, limited blocker recheck and independent human approval are implemented. The application **does not send** messages or decide candidate eligibility. Results/export, failure retry and live provider integration remain unfinished.

## Experiment files — preserve unchanged

- `eval/runs/2026-10-27T09-07-17-583Z-baseline.json`: deterministic keyword baseline, not AI.
- `eval/runs/2026-10-27T09-27-22-013Z-llm.json`: 30/30 API request failures (deprecated temperature + wrong variable precedence).
- `eval/runs/2026-10-27T09-27-47-053Z-llm.json`: genuine Anthropic Haiku 5.5 Run 2, 28 completed and 2 truncated.
- `eval/runs/2026-10-27T09-59-39-835Z-llm-recovery.json`: only E017/E028 rerun with `max_tokens:800`; both completed.
- `eval/rescored/`: scoring v2 re-interpretation files; original raw runs remain intact.
- `eval/dataset/v0.1.json`: original **AI-drafted** synthetic labels; `eval/dataset/v0.2.json`: **proposed, unconfirmed** revisions.

**Corrected Run 2 summary, provisional v0.1:** 27/30 primary correct (90.0%, all attempted); 17/30 keyword baseline (56.7%); 26/28 attention decisions correct (92.9%) on completed outputs; 0 missed, 2 false alarms and 2 unassessable due to truncation. The 93.3% under proposed v0.2 comes from relabeling the same outputs. Do not call these independently human-validated metrics.

## UI-04 R1 parity — interpretations matter

- Latest report: `docs/evidence/ui-04-r1/parity-report.json`.
- **170 unmodified** same-browser comparisons and **6 UX-04-01 exception** comparisons: all report 0 different pixels against their appropriate reference; no overflow recorded.
- For 6 exceptions, the comparison HTML has the **same approved one-line state correction** applied; the output differs deliberately from the untouched HTML, because the untouched design trapped mobile users.
- The frozen screenshots may differ cross-environment because of font rasterization and metrics; the 320px detailed screen had a documented 30px cross-machine height difference in UI-03. Do not suppress this history or equate screenshot parity with accessibility.
- Claude reported `npm run verify:reference`, lint, typecheck, build, 82 Vitest tests and 202 Playwright tests passing. GitHub connected source/evidence were independently inspected, but **the commands were not independently executed during acceptance**.

## Privacy, provenance and disclosure

- Synthetic sample and test inputs only were reported; `.env.local` remains ignored and was not committed, per Claude's secret check. This record does not replace a production secret scan.
- `src/lib/processing/mock.ts` is **not a real model call**; it creates provenance-marked simulated responses. The separate CLI `eval/run.ts` did make real provider calls.
- AI coding agent: Claude Code. Acceptance/source reviewer and closeout drafting: ChatGPT. Owner authorized bounded changes and UX-04-01; dataset label sign-off **not** obtained.
- An editor may have written this evidence closeout after the dated activities; do not present its preparation time as the time each activity occurred.

## Outstanding human confirmation and Day 2 handoff

- **Human confirmation needed:** `docs/intent.md` narrative and factual chronology, proposed evaluation label adjudication; don't change label_status to `owner_confirmed` until personally verified.
- **Day 2 implementation focus:** UI-05 retry and Results/export, then bounded server-side Anthropic integration; preserve both processing failure and review states, prevent dropped/duplicate/unexpected outcomes.
- **Accessibility target:** WCAG 2.2 AA; enforce core-path keyboard/focus/status behavior immediately, Playwright/axe automation Day 3, formal manual screen-reader/zoom/contrast/reflow audit in UI-06/Day 4; Day 5 requalification. No conformance claim yet.
- **Remaining MUST submission artifacts:** Loom process walkthrough, `intent.md`, `Final directive.md`, code/README, Days 1–5 logs, 5-minute product walkthrough, 1-page unlearning note. The Day 1 log and Day 1 unlearning notes are evidence inputs, not substitutes for all seven final attachments.

**No code changes or Day 2 implementation are part of this closeout.**
