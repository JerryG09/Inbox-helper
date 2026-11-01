# FINAL SUBMISSION — Candidate Inbox Helper (MUST Match Hire, Option A)

**Prepared:** 1 November 2026 (WAT)
**Status:** `MUST_REPOSITORY_READY_AWAITING_FINAL_RECORDINGS`
**MUST portal submission:** **NOT SUBMITTED.** It is waiting for the owner's Loom and demo recordings. A GitHub push is not a MUST submission.

**Repository:** https://github.com/JerryG09/Inbox-helper (branch `main`)

## Summary

Candidate Inbox Helper is a local recruiter tool built to the approved Hi-fi V1.1 design. It:
- imports synthetic candidate messages from a CSV file or manual entry
- classifies each message into six intents, with secondary intents and attention flags
- drafts a short suggested reply for every message
- requires a human to review, edit, approve or reject each draft

It never sends messages and never makes hiring decisions. It has two modes: deterministic simulation (the default) and local-only genuine Anthropic Haiku 5.5.

## Implemented features

- **Intake:** CSV import with a validation preview, manual entry, and a built-in sample.
- **AI:** classification with a short draft. Model output is validated by a strict server-side schema, and a deterministic hiring-claim detector and injection flag also run.
- **Review:** a Pending → Approved/Rejected workflow. Blocked drafts must be edited, rechecked and then explicitly approved.
- **Inbox:** grouped by intent, with an attention panel and primary-intent correction.
- **Retry and export:** retry of failed items only, a results view, and CSV export with a formula guard.
- **Limits:** live requests are capped at 10 messages each; requests are accepted from loopback/same-origin only; no authentication or deployment.

## Genuine model evaluation (EVAL-04C, `08b77e4`, 30 Oct 2026)

| Metric | Value |
|---|---|
| Dataset | 30 owner-adjudicated synthetic messages, frozen before the run (`8fb8da1`) |
| Model | Claude Haiku 5.5 (`claude-haiku-5-5`) |
| Completed | 30/30 |
| Strict primary intent | 25/30 (83.3%) |
| Lenient primary intent | 29/30 (96.7%) |
| Deterministic baseline, strict | 13/30 (43.3%) |
| Secondary intents F1 | ≈ 0.539 (P 7/17, R 7/9) |
| Attention recall / precision | 11/12 / 11/22 |
| Estimated API cost | $0.00777 |

Evidence: [`docs/evidence/day4-eval04c/`](../evidence/day4-eval04c/).

## Deliverables

| # | Deliverable | Link / status |
|---|---|---|
| 1 | Loom AI-native workflow | **PENDING_OWNER_RECORDING**. `<LOOM_URL_PENDING>`. Script: [`recording-scripts.md`](recording-scripts.md) |
| 2 | intent.md | [`intent.md`](../../intent.md) |
| 3 | Final directive.md | [`Final directive.md`](../../Final%20directive.md) |
| 4 | Working code + README | [repository](https://github.com/JerryG09/Inbox-helper), [`README.md`](../../README.md) |
| 5 | Five dated daily logs | [`docs/daily-log/`](../daily-log/) (27–31 Oct; Day 5 is a retrospective written on 1 Nov) |
| 6 | Five-minute demo | **PENDING_OWNER_RECORDING**. `<DEMO_URL_PENDING>`. Script: [`recording-scripts.md`](recording-scripts.md) |
| 7 | One-page unlearning note | [`one-page-unlearning-note.md`](one-page-unlearning-note.md) |

## Known limitations

**Safety:**
- **R-HANDOFF (P1):** 11 drafts claim a recruiter handoff already happened. The fix (SAFE-04) is not implemented.
- **R-CONTRA (P1):** H025 mishandles a retracted withdrawal.
- **Detector gaps:** the detector has pinned gaps (KL-1/2/3, R-INJ, R-WD, R-PII).
- **Attention:** the model over-flags attention (11 false positives).
- **Human review:** human safety review of the drafts is incomplete.

**Accessibility:**
- `main` has the Day 3 accepted fixes only.
- A11Y-04 (Phase A `5a951f5`) and A11Y-05/06/07 (UI-06C `4e3be63`, visual acceptance pending) are on separate branches and not merged.
- Manual screen-reader, browser, zoom and high-contrast checks have not been done.
- **No WCAG conformance claim.**

**Evaluation:**
- n = 30 synthetic, Claude-authored messages, labelled by a single, non-blind adjudicator.
- The results describe one run only; there is no production claim.

## Verification (1 Nov 2026, cost-free checks)

Recorded in the Day 5 final report. No Anthropic calls, builds or browser suites were run.

## To complete the submission (owner)

1. Record both videos using [`recording-scripts.md`](recording-scripts.md).
2. Replace `<LOOM_URL_PENDING>` and `<DEMO_URL_PENDING>` in this file and in [`submission-manifest.md`](submission-manifest.md), then push.
3. Submit the repository URL, the two video URLs and the document links on the official MUST portal.
