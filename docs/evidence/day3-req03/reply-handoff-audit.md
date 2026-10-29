# REQ-03C — Short-reply and approval-handoff audit

**Provenance:**
- Word counts come from the **five accepted genuine Anthropic drafts**, which were read only and not modified:
  - `docs/evidence/ai-01/live-results-export.csv`, column `original_ai_draft` (4 drafts)
  - `docs/evidence/day2-closeout/application-observation.json`, field `draft` (1 draft)
- Counting method: whitespace-separated tokens, including the greeting and sign-off. Computed by a Python script during this slice.

## Word counts

| Draft | Primary intent (as recorded) | Words | Under 120? |
|---|---|---|---|
| AI-01 A01 | Application status | 49 | Yes |
| AI-01 B01 | Documentation / technical (+ Interview scheduling) | 58 | Yes |
| AI-01 C01 (prompt injection) | Other / unclear | 60 | Yes |
| AI-01 M003 | Job information | 45 | Yes |
| Day 2 Scenario E (withdrawal) | Withdrawal | 68 | Yes |

- Min **45**, max **68**, mean 56.
- **0 of 5** exceed the prompt's "under 120 words".
- n = 5 is far too few to claim compliance in general. Day 4 measures this on 30 held-out messages.

**Enforcement:** the 120-word limit is **requested only** (`SYSTEM_PROMPT` in `src/lib/processing/provider.ts`).
- The server schema caps `draft_reply` at 1,500 characters, with no word check.
- A 150-word draft would therefore be accepted and shown for review.
- **Recommendation:** measure it on Day 4 before deciding whether to enforce it. Rejecting a usable draft as Failed would add retries and cost; a review warning could be a lighter option. Either would be a product change needing approval.

## Original vs reviewed drafts, and export
- **Distinguishable:**
  - `originalAiDraft` is set once in `applyOutcome` and never modified; edits change `currentDraft` only (`transitions.ts`).
  - The CSV has separate `original_ai_draft` and `reviewed_draft` columns.
  - Evidence: `live-results-export.csv` row A01, where the human-edited approved draft differs from the original; `results-export.test.ts` "original AI draft after edit"; `live-flow.spec.ts` R1 CSV checks; AI-02 R1 browser proof.
- **Reviewed draft in the CSV:** `exportRow()` → `reviewed_draft` = `currentDraft`; checked in the AI-02 R1 browser test.
- **No send on approval:**
  - `approveDraft()` only sets `review: "approved"`.
  - The UI announces "Draft approval recorded. No message was sent." (`review-flow.spec.ts`).
  - `app-shell.test.tsx` "contains no send path".
  - The only network route is `/api/process` (classification), and it isn't called on approval.

## Handoff options

| | Option 1 — keep current retrieval (Review detail + Results CSV) | Option 2 — future "Copy approved reply" control |
|---|---|---|
| User value | Works now. The CSV gives an auditable batch handoff with original and reviewed text. | Faster single-reply handoff into the recruiter's email/ATS: one click instead of select-all or a CSV download |
| Cost | None | Small code change, plus a clipboard permission/fallback, focus/announcement handling and tests |
| Design implications | None; frozen V1.1 unchanged | Needs an **owner-approved visual exception** to the frozen V1.1 reference. It must copy only the approved text, must never imply sending, and needs an accessible status message. |
| Risk | Recruiters may copy an unapproved draft from the editor | Must be disabled unless Approved, otherwise it becomes a bypass of review |

**Recommendation: Option 1 for the five-day challenge.** It already satisfies "a human reviews every draft before it is sent" and is fully evidenced. Record Option 2 as a candidate post-challenge improvement. If the owner wants it for the demo, it needs its own bounded UI authorisation with a parity exception. **Not implemented.**
