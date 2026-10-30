# Day 4 handoff — Friday 30 October 2026

> **Current state (updated 30 Oct 2026, Day 4 Phase A).** Day 3 is merged: `main` = `1991ec0`. The starting point below is the historical Day 3 view, kept unchanged. Day 4 work is on three separate branches: `day4/eval04b-owner-label-freeze` (`8fb8da1`, labels frozen and accepted), `day4/eval04c-first-pass-evaluation` (`08b77e4`, first pass accepted as evidence) and `day4/eval04a-ui06-qualification` (accessibility). See `docs/evidence/day4-eval04a/README.md`.

**Starting point:**
- Day 3 is `DAY_3_ENGINEERING_AND_EVIDENCE_ACCEPTED_PENDING_MERGE`. The accepted HEAD is `66e535d`, plus the documentation closeout on `day3/final-evidence-closeout`.
- `main` = `6a23fe2` until the owner authorises a fast-forward integration and it is verified.
- Day 4 work should start from the integrated `main`, or from a ref the owner names.

Keep the scope to a **small, demonstrable tool** within the MUST five-day deadline.

## A. EVAL-04 — Held-out model evaluation

**Dataset:** `eval/heldout/day4-candidate-messages-v1.json`.
- Status `NOT_FROZEN`; all 30 labels are `AI_PROPOSED_UNVERIFIED`.
- Draft SHA-256 `44c5c904f028255515c76b851297bde72b457314aba0c3af1a6996b2a4da68ac`.
- **Claude authored both the messages and the labels. The target Haiku evaluation has not run on this dataset.** It is not human-labelled until the owner adjudicates it.

**Steps:**
1. **Human adjudication** of all 30 rows using `docs/evaluation/day4-label-adjudication.md`. Give particular attention to these three:

   | Case | Content | Question to decide |
   |---|---|---|
   | **H008** | Conditional withdrawal ("if remote isn't possible…") | Interview scheduling vs withdrawal as primary |
   | **H025** | Contradictory withdraw-then-pause instruction | Primary intent, and whether it must never be actioned without confirmation |
   | **H026** | Job enquiry made on behalf of a 16-year-old minor | Other / unclear vs job information; whether an attention flag is needed |

2. **Freeze.** Write the owner-confirmed labels to a new frozen file with `freeze_status: FROZEN`. Commit it and record its SHA-256 **before any model run**.
3. **Configuration and run path, recorded in advance.**
   - Model `claude-haiku-5-5` (plus the model string actually returned).
   - Prompt `live-v1`, `max_tokens` 1,600, thinking off, structured output, 20 s timeout, concurrency 2, no automatic retries.
   - **Path A:** three bounded requests of ten to `/api/process` (`handleProcess` → `processRecords` → `processOne`).
   - **Path B:** a separately documented harness.
4. **Deterministic baseline** on the same frozen 30 messages (no cost).
5. **Separate explicit authorisation** for genuine provider calls, with a budget. The estimate is about $0.008; the price must be re-verified.
6. **Intent quality:**
   - Primary accuracy, strict and with acceptable alternatives.
   - Per-intent confusion matrix.
   - Secondary precision and recall.
   - Handling of the 12 multi-intent messages.
7. **Attention detection:** recall and precision, with model-only and server-flag contributions reported separately.
8. **Draft quality and safety:**
   - Word counts against the 120-word guidance.
   - Detector blocks.
   - **Manual reading of every draft** for unsupported decisions or third-party data (KL-1..3, R-WD, R-PII).
9. **Usage:** tokens, latency (min/median/max) and estimated cost, with a dated price source.
10. **Failures:** report failed, truncated, schema-invalid and unassessable outcomes separately, with explicit denominators. Keep raw model results apart from any human-corrected results.

## B. UI-06 — Formal accessibility qualification

The owner-approved UI-06A improvements (UX-A11Y-01/02/03) **must remain intact**.

Carry forward:
- **A11Y-04:** the frozen button/link/summary focus ring #8a91fb measures 2.79:1 on white, below the 3:1 reference (1.4.11).
- The static "Review status" `<label>` semantics.
- Screen-reader verification (e.g. VoiceOver, with its version recorded).
- Safari and Firefox checks (UX-A11Y-02 relies on `:has()`).
- 200% zoom and reflow at 320 CSS px.
- Forced-colours / high-contrast behaviour.
- Full keyboard workflows: Import → Inbox → Review → Results → CSV.
- Text and non-text contrast.
- Focus Not Obscured (2.4.11), including sticky and overlay cases.

A formal assessment targeting WCAG 2.2 AA is still pending. Do not claim conformance from automated checks.

## C. Final submission preparation (toward Day 5)

| Item | Work needed |
|---|---|
| Loom (AI-native process) | Follow `docs/submission/recording-shotlist.md` Recording 1; include the R1/R2, R-REJ and focus-parity investigations as human-over-AI examples |
| Five-minute demo | Recording 2. Label genuine Anthropic, fake provider and simulation on screen; show that nothing is auto-sent |
| `Final directive.md` | Author it with the owner |
| One-page unlearning note | Synthesise from `docs/unlearning/` and the Day 2 log lessons |
| README | Add the limitations listed in the manifest (item 4) |
| Submission links and manifest | Record the final SHA, check every link, independent review |

## Open risks carried into Day 4
See `docs/evidence/day3-closeout/README.md` § Limitations:
- **Safety:** KL-1..3, R-INJ, R-WD, R-PII, F-HIST, and further rejection phrasings.
- **Accessibility:** A11Y-04, review-status semantics, untested assistive tech and browsers.
- **Operations:** 10 messages per live request, batch replacement on import, per-request concurrency, unauthenticated local endpoint, no persistence, no sending.
- **Model evaluation:** n = 5 genuine messages, unverified labels, no held-out result.
