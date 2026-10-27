# intent.md — MUST Option A: Candidate Inbox Helper

Original statement of what this project is for, written on Day 1 (27 October 2026) from the dated evidence in this repository. Entries are in chronological order; nothing is backdated. Where a source is cited, the claim comes from that file; anything else is marked as needing owner confirmation.

## Problem

Recruiters receive many short, mixed candidate messages (status chasers, rescheduling, role questions, upload problems, withdrawals). Triage is repetitive, and a careless reply can misstate a hiring decision. The tool helps a recruiter **sort and draft**, while a human makes **every** decision. Nothing is ever sent automatically.

## What AI is for — and not for

- **For:** classifying each message into one primary intent plus any secondary intents, flagging items that need human attention, and (in a later slice) drafting a reply for human editing.
- **Not for:** sending messages, making or implying hiring decisions, ranking candidates, or handling real candidate data during the challenge.
- Every AI-completed item starts as Pending human review. Simulation is always labelled as simulation.

## Initial intents (six)

| id | Label (as in approved UI) | Meaning |
|---|---|---|
| `application_status` | Application status | Where the application stands / whether a decision exists |
| `interview_scheduling` | Interview scheduling | Book, confirm, move or cancel an interview |
| `job_information` | Job information | Questions about the role: duties, remote policy, salary, start date |
| `documentation_technical` | Documentation / technical | Document requirements, upload/portal/link problems |
| `withdrawal` | Withdrawal | Wants to stop being considered |
| `other_unclear` | Other / unclear | None of the above, too vague, or not a candidate enquiry |

Source of truth in code: `src/lib/domain/intents.ts` (with the typed `ClassificationSchema`).

## Chronology

### 26 October 2026 — pre-start preparation (before the quest timer)
Source: `reference/hifi-v1.1/docs/HiFi-V1.1-Handoff-Signoff.md`, `reference/hifi-v1.1/README-FIRST.md`, `reference/hifi-v1.1/MANIFEST.json` (`approved_date: 2026-10-26`).
- Low-fi V0.3 user journey frozen; Hi-fi V1.1 correction pass produced (11 findings, UX-R01 … COPY-R11, fixed).
- Hi-fi V1.1 **visually approved by the owner** and frozen with a zero-unapproved-disparity rule.
- Prototype explicitly an offline simulation: no real model calls, latency or cost measurements.
- The README at that time recorded the quest timer as *not confirmed started*.

### 27 October 2026 — timed work (Day 1)
- ~08:52 WAT: quest timer started (per `docs/MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md` §11, "from owner screenshots"; the live MUST timer is authoritative).
- Contract V1.1.1 adopted: Claude may implement, commit and push owner-approved slices to feature branches.
- **DAY1-01** (UI-00 + UI-01): commit `1005fe260d03b0ebf9d8fad9b0db67dddd0fdd39` on `day1/ui-foundation`; independently accepted by the owner; `main` now points to it.
- **DAY1-02** (this slice): intent taxonomy, synthetic evaluation dataset, deterministic baseline, typed output schema, LLM evaluation harness. See `docs/daily-log/2026-10-27-day1.md`.

## Success criteria for the AI component (initial, to be refined with data)
1. Every model output either validates against `ClassificationSchema` or is recorded as a failure — never silently coerced.
2. The model beats the deterministic baseline on primary-intent accuracy and intent recall on the same dataset.
3. Zero missed attention flags on adversarial items (injection, hiring-decision demands, threats, formula-like input).
4. Results are only reported against **owner-confirmed** labels.

## Owner to confirm
- Exact Oct 26 preparation activities beyond what the cited files record (e.g. time spent, tools used).
- The dataset labels in `eval/dataset/v0.1.json` (drafted by Claude, see `label_status`).
