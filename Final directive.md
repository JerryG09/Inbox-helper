# Final directive — Candidate Inbox Helper (MUST Option A)

**Version:** final submission directive, 1 November 2026.
**Use:** a standalone implementation specification. An engineer or coding agent should be able to rebuild the product from this document plus the frozen design bundle in `reference/`. It describes the scope actually implemented in `main`. Items marked **NOT IMPLEMENTED** are recorded so nobody assumes they exist.

## 1. Problem and target user

- **User:** a recruiter or recruiting coordinator who receives many short, mixed candidate messages: status chasers, interview rescheduling, role questions, upload problems and withdrawals.
- **Problem:** triage is repetitive, and a careless reply can state or imply a hiring decision that was never made.
- **Product goal:** help the recruiter **sort and draft**. A human reviews every result and makes every decision. Nothing is ever sent automatically.

## 2. Non-negotiable boundaries

1. **No sending.** No email, ATS, messaging or webhook integration. The UI has no send path. Approving a draft only changes its review status.
2. **No hiring decisions.** The AI must not decide, rank, reject or select candidates, or state or imply an outcome. "Reject draft" rejects the draft, never the candidate.
3. **Human review of everything.** Every AI-completed item starts as **Pending**. Only an explicit human action can make it **Approved**.
4. **Synthetic data only.** During the challenge, use invented candidate data only.
5. **Honest labelling.** Simulated output is labelled as simulation. Genuine model output is labelled as live. Neither may be presented as the other.

## 3. Intent taxonomy

Each message receives exactly one **primary** intent and zero or more **secondary** intents from this fixed set. The source of truth in code is `src/lib/domain/intents.ts`.

| id | UI label | Meaning |
|---|---|---|
| `application_status` | Application status | Where the application stands, or whether a decision exists |
| `interview_scheduling` | Interview scheduling | Book, confirm, move or cancel an interview |
| `job_information` | Job information | Duties, remote policy, salary, start date |
| `documentation_technical` | Documentation / technical | Document requirements; upload, portal or link problems |
| `withdrawal` | Withdrawal | Wants to stop being considered |
| `other_unclear` | Other / unclear | None of the above, too vague, or not a candidate enquiry |

## 4. Intake

- **CSV import:**
  - Required headers: `id` and `message`. Optional headers: `candidate_name` and `subject`.
  - Whole-file problems are rejected outright, for example an unreadable file or missing required headers.
  - Row problems appear in a **validation preview** with their reasons: an empty message, a duplicate id, or a message over **2,000 characters**. Invalid rows are not processed.
- **Manual entry:** a form takes a single message with the same fields and the same validation.
- **Sample data:** a built-in six-message synthetic sample (M001–M006), plus invalid example rows, demonstrates the flow.

## 5. Processing modes

- **Simulated** (default):
  - Deterministic, with no network access and no model calls.
  - Used by the visual-parity and regression tests, and labelled as simulation in the UI.
- **Anthropic live** (local development only):
  - Set `INBOX_PROCESSING_MODE=anthropic`, `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL=claude-haiku-5-5` in `.env.local`.
  - The browser receives only the mode and model name, never the key.
  - Messages are sent only when the user presses **Start AI processing**.
- **Live request limits** in `POST /api/process`:
  - At most **10 messages per request**, rejected before any model call if exceeded.
  - At most 2,000 characters per message and a 64 KB request body.
  - Accepts only loopback hosts and same-origin requests.
- **Per-message model call:**
  - Structured JSON output, `max_tokens` 1,600, thinking off, 20-second timeout.
  - At most 2 calls at once, and no automatic retry.

## 6. AI classification and short draft

For each message, the model returns:
- primary intent
- secondary intents
- short summary
- attention reasons
- a short suggested reply (under ~120 words)

**Server-side rules:**
- Every model output is validated with a strict schema (`.strict()`, no markup, no extra control fields). Invalid output is recorded as a failure (`provider_schema_invalid`). It is never coerced or shown as a draft.
- Candidate text is JSON-encoded inside an untrusted-message delimiter, with `<` escaped, so injected markup cannot break out.
- A deterministic **hiring-claim detector** (`src/lib/safety/hiring-claims.ts`) runs on every draft, whatever the model reports.
  - Offer, selection, hire or rejection wording **blocks** the draft.
  - Completed-withdrawal wording raises a **warning**.
  - A model's "safe" flag can never clear a detector finding.
- A deterministic injection check on the candidate message adds an attention reason.

## 7. Human review and editing

- **States:** processing `queued → processing → completed | failed`; review `pending → approved | rejected`.
- **Reviewer actions:** the recruiter can edit a draft, approve it, or reject it. The original AI draft is always kept alongside the reviewed draft.
- **Blocked drafts:**
  - A blocked draft is **not approvable**, and an edit alone leaves it blocked.
  - **Recheck** reruns the detector. A passing draft returns to **Pending**, and the recruiter must then approve it explicitly. Recheck never approves anything.
- **Announcements:** the UI states that no message was sent whenever a draft is approved.

## 8. Grouping, attention flags and correction

- The inbox groups messages by primary intent and shows secondary intents as tags.
- An **attention panel** lists items whose current attention reasons are non-empty or whose draft is blocked.
- The recruiter can correct the classification. Historical AI findings are kept separately from the current attention state.

## 9. Retry, results and CSV export

- **Retry:** failed messages can be retried manually, only the failed ones. Completed items are never reprocessed silently.
- **Results:** a results view summarises processing and review status.
- **CSV export** (`candidate-inbox-demo-results-v1-1.csv`):
  - Columns: `id, candidate_name, subject, message, processing_status, review_status, primary_intent, secondary_intents, current_attention_state, current_attention_reasons, historical_ai_findings, original_ai_draft, reviewed_draft, processing_error`.
  - Cells starting with spreadsheet formula characters are neutralised, to guard against CSV injection.

## 10. Security and privacy

- **No public deployment.** `/api/process` has no authentication, rate limiting or abuse protection. Deploying it requires a separate security gate, which has not been done.
- **Secrets:** they live only in git-ignored `.env.local`. They must never be logged, committed, shown in recordings or sent to the browser.
- **Server call log:** contains no message content.
- **No storage:** there is no database or permanent storage. State lives in the browser session only.

## 11. Evaluation and acceptance requirements

1. Every model output either validates or is recorded as a failure.
2. **Labels before results.** Held-out reference labels must be human-adjudicated and frozen, with a hash, **before** any held-out model run. Scores against post-hoc labels must be labelled post-hoc.
3. **Baseline comparison.** Compare against the deterministic baseline (`src/lib/classify/baseline.ts`) on the same frozen set. Report strict and lenient scores side by side, each with its numerator and denominator.
4. **Provider failures** (API errors, truncation, unsupported parameters) are reported separately from classification errors.
5. **Raw runs are immutable.** Corrections are new files, never edits.
6. **Classification ≠ draft safety.** Draft safety needs separate human review.

**Accepted first-pass result (EVAL-04C, `08b77e4`):**
- Dataset: 30 owner-adjudicated synthetic messages, frozen file SHA-256 `646128933def19264ef6228bb944083de59e6e2bc4470ef077537d53b674d412`.
- Model: `claude-haiku-5-5`, 30/30 completed.
- Primary intent, strict: **25/30 (83.3%)**, against **13/30 (43.3%)** for the baseline.
- Primary intent, lenient: **29/30 (96.7%)**.
- Secondary intents: precision 7/17, recall 7/9, F1 ≈ 0.539.
- Attention: recall 11/12, precision 11/22.
- Estimated cost: **$0.00777**.

## 12. Accessibility requirements

- **Target:** WCAG 2.2 A/AA. The product supports keyboard operation, visible focus, live-region announcements and forced-colors support.
- **Contrast exceptions:** these go in `src/styles/ui-06a-accessibility.css`. They are measured and need owner approval. The frozen `src/styles/hifi-v1.1.css` must stay byte-identical to the approved prototype.
- **In `main`:** the Day 3 accepted corrections (UX-A11Y-01/02/03).
- **Not in `main`:**
  - The A11Y-04 focus-ring correction (Phase A `5a951f5`, owner-accepted).
  - The A11Y-05/06/07 contrast corrections (UI-06C `4e3be63`, owner visual acceptance pending).
- No conformance claim may be made without manual screen-reader, multi-browser, zoom and OS high-contrast checks.

## 13. Known limitations (must be disclosed)

- **R-HANDOFF (P1):** 11/30 genuine drafts falsely state the enquiry "has been passed" to the recruitment team. A prompt or guard fix (SAFE-04) was authorized but **NOT IMPLEMENTED**.
- **R-CONTRA (P1):** H025, a retracted withdrawal, was treated as an active withdrawal.
- **Detector gaps:** the detector is pattern-based and has known misses (KL-1/2/3, R-INJ, R-WD, R-PII). Nine expected-failure pins document these.
- **Attention flags:** the model over-flags attention (11 false positives in 30).
- **Evaluation limits:** n = 30, synthetic and Claude-authored; labels are not blind and come from a single adjudicator. No production-performance or production-safety claim is made.
- **No WCAG conformance claim.** The unchanged full browser parity suite is not green on the UI-06C branch.

## 14. Next work, if continued

1. **SAFE-04:** remove the premature handoff wording and handle retracted withdrawals; add regression tests; re-evaluate only on a new authorized run.
2. **Integration:** after owner visual acceptance, integrate Phase A and UI-06C, and decide what happens to the parity gate.
3. **Manual accessibility checks:** screen reader, Safari/Firefox, zoom and high contrast.
4. **Security gate:** authentication and rate limiting before any deployment.
