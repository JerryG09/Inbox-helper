# Day 1 unlearning evidence — 27 October 2026

**Project:** MUST Option A, Candidate Inbox Helper. **Status:** dated observations for the eventual one-page MUST submission; **not** the final submission note. Drafted with AI assistance from the actual source, commit and test-evidence history. These are the real observed changes in approach, not claims about what an AI model thought internally.

| Previous working assumption | What today's evidence challenged | New practice | Evidence |
|---|---|---|---|
| Pixel-perfect implementation proves the design works | At ≤900px the approved prototype and its exact implementation hid the list after the last Pending decision, leaving the user trapped in an empty detail pane | Behavioral tests and accessibility review can override a frozen reference through a **recorded, owner-authorized** correction | UI-04 `1836dae`; owner-approved UX-04-01 in `628f85d`; `docs/evidence/ui-04-r1/` |
| If a request fails, it is evidence the model is bad | First 30 real Anthropic calls all failed for invalid request parameters and using the wrong model configuration—not failed classification judgment | Separate request/harness faults from model judgments; record model identifier, params, HTTP errors, and full run history | `eval/runs/2026-10-27T09-27-22-013Z-llm.json`; harness fix `c97ee8d` |
| An unparseable output means the model missed a safety warning | Two responses hit `max_tokens`; both partial outputs signaled attention. Old scoring counted them as missed warnings | Distinguish completed, truncated, failed and missing; score attention only where a complete usable answer exists | `src/lib/eval/score.ts`, `interpret.ts`; `eval/rescored/` in `06b5fae` |
| A JSON answer needs only enough tokens for the visible JSON | E017 used **389 thinking tokens** among **512 output tokens** in a bounded 800-token retry; 400 had been insufficient | Budget for provider thinking/output; test stop reasons; retain truncation as a reliability outcome | `eval/runs/2026-10-27T09-59-39-835Z-llm-recovery.json` |
| A higher model score after relabeling proves a better prompt/model | Primary accuracy became 93.3% from 90.0% when AI-drafted labels were revised; **model predictions were unchanged** | Lock human labels before held-out evaluation; disclose post-hoc dataset adjudication | `eval/dataset/v0.1.json`, proposed `v0.2.json`, `docs/evaluation/label-adjudication-v0.2.md` |
| Generated UI and simulated AI are equivalent to a real AI workflow | Day 1 UI uses exact-match canned fixtures or labeled rule-based fallbacks, whereas a separate CLI actually called Anthropic | Track output provenance and avoid attributing demo results to a provider; verify live integration separately | `src/lib/processing/mock.ts` and `eval/runs/` |

## Numbers to quote accurately

- 30-message *exploratory synthetic* Run 2 (AI-drafted v0.1 labels): real Haiku 5.5 **27/30 (90.0%)** primary accuracy versus **17/30 (56.7%)** keyword baseline, with **28/30** completed classifications; **two** truncated.
- Attention outcomes on the **28 completed** results: **26/28 (92.9%)** correct, **0** missed attention flags, **2** false alarms; the two truncated responses are **unassessable**, not successes or missed warnings.
- Both targeted truncated responses completed when retried at `max_tokens:800`, with no full-batch rerun and no reproducibility/stability claim.
- UI-04 R1: Claude reported **82 unit / 202 browser tests passing**; repository evidence records **170 unchanged** visual states plus **6 explicit UX-04-01 exception** states at zero same-browser differences. This is not proof of WCAG 2.2 AA conformance.

## Unlearning statement candidate (to refine on Day 5)

> I had assumed that matching an approved design and obtaining valid AI-looking output were strong evidence of correctness. On Day 1, strict visual parity reproduced a mobile dead end, and the initial model score conflated truncated responses with missed safety alerts. I changed the acceptance rules: preserve failed experiments, separate provider failures from model judgments, demand human review for drafts, and allow a documented accessibility correction even when it breaks literal parity. The result was a testable process, not a claim that either the UI or the model was infallible.

**Still open:** formal human adjudication of evaluation labels; independent held-out testing; live app/provider integration; accessibility audit; complete Results/retry/export. Do not claim these are done.
