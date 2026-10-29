# Submission evidence index (master)

Links claims to committed evidence. Raw evidence stays where it was committed; this index only points to it.

**Provenance codes:**
- **G**: genuine Anthropic call
- **F**: local fake provider
- **S**: deterministic simulation
- **U**: unit test
- **M**: manual / owner review
- **L-AI**: model-authored labels
- **L-H**: human-confirmed labels

**Review codes:**
- **ACCEPTED**: independent architect/owner acceptance recorded
- **PENDING**: awaiting review
- **N/A**

Deliverable numbers refer to `submission-manifest.md`.

| ID | Claim / behaviour demonstrated | Day · milestone | Prov. | Source path | Commit | Review | Limitations | Deliverable |
|---|---|---|---|---|---|---|---|---|
| E-D1-01 | Frozen V1.1 reference integrity; app shell; visual parity method | D1 · UI-00/01 | U, S | `docs/evidence/day1-01/` | `1005fe2` | ACCEPTED | Parity is same-browser pixel comparison, not usability | 4, 1 |
| E-D1-02 | First genuine LLM evaluation, 30 exploratory messages: Run 1 failed (request config); Run 2 had 28 completed + 2 truncated | D1 · DAY1-02 | G, L-AI | `eval/runs/` | `c97ee8d` | ACCEPTED | Exploratory dataset; AI-drafted labels; **not held-out** | 1, 7 |
| E-D1-03 | Scoring v2 separates truncated from wrong; v0.2 label adjudication | D1 · DAY1-02 R1 | G, L-AI, M | `eval/rescored/`, `docs/evaluation/label-adjudication-v0.2.md` | `06b5fae`, `1bffd94` | ACCEPTED | v0.2 labels revised post hoc; must not be reused as a held-out test | 1, 7 |
| E-D1-04 | Intent statement, owner sign-off | D1 | M | `docs/intent.md` | `1bffd94` | ACCEPTED | — | 2 |
| E-D1-05 | CSV/manual import and validation | D1 · UI-02 | U, S | `docs/evidence/ui-02/` | `a5b5980` | ACCEPTED | Simulated | 4, 6 |
| E-D1-06 | Intent-grouped inbox | D1 · UI-03 | U, S | `docs/evidence/ui-03/` | `b299ad7` | ACCEPTED | Simulated | 4, 6 |
| E-D1-07 | Human review, correction, blocked-draft transitions | D1 · UI-04 | U, S | `docs/evidence/ui-04/` | `1836dae` | ACCEPTED | Simulated | 4, 6 |
| E-D1-08 | UX-04-01 owner-authorized mobile exception | D1 · UI-04 R1 | U, S, M | `docs/evidence/ui-04-r1/` | `628f85d` | ACCEPTED | Not a WCAG claim | 1, 7 |
| E-D1-09 | Day 1 evidence index and log | D1 closeout | M | `docs/evidence/day1-closeout/README.md`, `docs/daily-log/2026-10-27-day1.md` | `62d6bd3`, `0eef60e`, `d0eb48b` | ACCEPTED | — | 5 |
| E-D1-10 | Day 1 unlearning observations | D1 | M | `docs/unlearning/day1-observations.md` | `62d6bd3` | ACCEPTED | Source notes, not the final note | 7 |
| E-D2-01 | Processing integrity I1–I7, failed-only retry | D2 · UI-05A | U, S | `docs/evidence/ui-05a/` | `746daa3`, `26bc198` | ACCEPTED | Simulated | 4, 6 |
| E-D2-02 | Batch Results and secure CSV export | D2 · UI-05B | U, S | `docs/evidence/ui-05b/` | `fb7d65b` | ACCEPTED | Simulated | 4, 6 |
| E-D2-03 | Genuine Anthropic integration: 4 live calls, safe provider boundary | D2 · AI-01 | G, F, U | `docs/evidence/ai-01/` (README, `live-call-metadata.jsonl`, screenshots, export CSV) | `7db4b44` | ACCEPTED | 4 calls; synthetic data; local-only endpoint | 1, 4, 6 |
| E-D2-04 | P0 detector correction R1 (unverified offer) | D2 · AI-01 R1 | F, U | `docs/evidence/ai-01/README.md` § R1 | `7d1c0f0` | ACCEPTED | Limited deterministic detector | 1, 7 |
| E-D2-05 | R2: not-only, later-occurrence, tag-question false negatives | D2 · AI-01 R2 | F, U | `docs/evidence/ai-01/README.md` § R2 | `9d34948` | ACCEPTED | KL-1..3 documented | 1, 7 |
| E-D2-06 | Owner acceptance of UX-AI-01/02 and AI-01 merge | D2 | M | commit `6ebc7fb` docs | `6ebc7fb` | ACCEPTED | — | 1 |
| E-D2-07 | Fifth genuine call (Scenario E, withdrawal) | D2 closeout | G | `docs/evidence/day2-closeout/` | `6a23fe2` | ACCEPTED | One call; timestamp is capture time | 1, 6 |
| E-D2-08 | Day 2 log, including unlearning observations | D2 | M | `docs/daily-log/2026-10-28-day2.md` | `6a23fe2` | ACCEPTED | — | 5, 7 |
| E-D3-01 | Requirements-to-evidence coverage audit | D3 · AI-02A | U, F | `docs/evidence/day3-ai02/qualification-matrix.md` | `47ca9c7` | PENDING | Claude-authored audit; Claude-run results | 1, 4 |
| E-D3-02 | Real SDK over HTTP: 429/500/529/401/network/timeout → safe codes; one attempt each | D3 · AI-02B | F, U | `test/live/provider-http.test.ts` | `47ca9c7` | PENDING | Local HTTP fake, not the real API | 4 |
| E-D3-03 | Concurrency cap is per request only (2 requests → 4 in flight) | D3 · AI-02B | F, U | same file | `47ca9c7` | PENDING | KNOWN_LIMITATION | 4, 6 |
| E-D3-04 | Adversarial safety matrix; residual risks pinned (KL-1..3, R-REJ [later resolved, E-D3-10], R-INJ, R-WD, R-PII, F-HIST) | D3 · AI-02C | F, U | `test/live/adversarial-safety.test.ts`, `docs/evidence/day3-ai02/safety-findings.md` | `47ca9c7` | PENDING | Not model resistance | 1, 4, 6, 7 |
| E-D3-05 | Mutation checks M1–M4 killed | D3 | U | `docs/evidence/day3-ai02/README.md` | `47ca9c7` | PENDING | Claude-run; not yet independently rerun | 1 |
| E-D3-06 | Preliminary accessibility observations A11Y-01..03 | D3 · AI-02D | U, S | `test/visual/a11y-preliminary.spec.ts`, `docs/evidence/day3-ai02/README.md` | `47ca9c7` | PENDING | No screen reader; not WCAG | 4 |
| E-D3-07 | Genuine performance/cost summary (n = 5) | D3 · AI-02E | G (historical) | `docs/evidence/day3-ai02/performance-notes.md` | `47ca9c7` | PENDING | Not a benchmark; price not re-verified | 1, 6 |
| E-D3-08 | Submission manifest and recording shot list | D3 · EVIDENCE-03 | M | `docs/submission/` | `47ca9c7` | PENDING | Plans only | 1, 6 |
| E-D3-09 | Day 3 log and unlearning | D3 | M | `docs/daily-log/2026-10-29-day3.md`, `docs/unlearning/day3-observations.md` | `47ca9c7` | PENDING | Day 3 not closed | 5, 7 |
| E-D3-10 | R-REJ resolved: rejection patterns in the shared detector; before-fix reproduction; 10 positive + 11 negative + lifecycle tests; fake-provider browser proof; mutation killed | D3 · AI-02 R1 | F, U | `docs/evidence/day3-ai02-r1/`, `test/live/adversarial-safety.test.ts`, `test/visual/live-flow.spec.ts` | `611b383` | PENDING | Limited phrase list; other rejection phrasings may pass | 1, 4, 6, 7 |
| E-D4-* | Held-out dataset, frozen labels, evaluation, accessibility audit | D4 | — | — | — | PLANNED | — | 1, 4, 6 |
| E-D5-* | Loom, demo, Final directive, final unlearning note, final SHA | D5 | — | — | — | MISSING | — | 1, 3, 6, 7 |
