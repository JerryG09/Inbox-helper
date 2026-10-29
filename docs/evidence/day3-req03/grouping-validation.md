# REQ-03B — Grouping and correction validation (simulated, browser)

**Provenance:**
- Simulated mode only: the approved V1.1 fixture classifications, plus the labelled rule-based fallback (NOT AI) for the out-of-taxonomy case.
- No model call. Claude-run; independent rerun pending.
- This proves the grouping and correction **workflow**, not classification quality (that is Day 4).

**Environment:**
- Playwright Chromium headless, project `simulated` (`next start` on :3100).
- Desktop Chrome viewport 1280×720, plus 390×844.
- Build from unchanged product source (`git diff 325caf6 -- src` is empty), so no rebuild was needed.

**Command:** `npx playwright test test/visual/grouping-req03.spec.ts --project=simulated` → **4 passed**.

## Reused existing coverage (not duplicated)
- `test/inbox/inbox.test.ts` "each record appears exactly once; multi-intent M002 is only under its primary".
- `test/domain/transitions.test.ts`: primary correction regroups and resets review; M002 swap keeps the former primary as secondary.
- `test/visual/review-flow.spec.ts` "keyboard: primary swap via select keeps focus and both intents".
- `test/inbox/results-export.test.ts`: corrected intents appear in the CSV.

## New assertions (`test/visual/grouping-req03.spec.ts`)

| # | Requirement | Test | Result |
|---|---|---|---|
| 1 | Same primary → together | "grouping…": Interview scheduling = [Ada, David]; Application status = [Sarah, Grace] | Pass |
| 2 | Distinct headings | Heading set has the same size as the group list | Pass |
| 3 | Exactly one group per message | 6 names, 6 unique | Pass |
| 4 | Multi-intent keeps secondary, no duplicate | David's "Documentation / technical" box is checked, and there is no Documentation group | Pass |
| 5 | Primary change relocates | Grace → Job information group | Pass |
| 6 | Promote secondary keeps the old primary as secondary | David → Documentation / technical, with Interview scheduling checked | Pass |
| 7 | Correction resets review | David Approved → after correction, **Pending** | Pass |
| 8 | Results and CSV reflect the correction | Results primary column; exact CSV prefix for M002 (`…"Pending","Documentation / technical","Interview scheduling"`) and M004 | Pass |
| 9 | Failed kept distinct | "Failed processing" group; no intent select; Results "Failed" / "—" | Pass |
| 10 | Out-of-taxonomy → Other / unclear, reviewable | CSV row "Is the office dog-friendly…" → Other / unclear → Approved | Pass |
| — | Original message and draft preserved after correction | `.original` text and draft value unchanged | Pass |
| — | Mobile 390 | Correction in detail → back → Ada listed under Withdrawal | Pass |

Group order follows the batch order of each group's first message (prototype behaviour).

**Screenshots:**
- `screenshots/grouping-initial-desktop-1280.png`
- `screenshots/grouping-after-correction-390.png`

## Limitations
- The fixture classifications are canned, so they say nothing about how well a model groups messages.
- The fallback classifier is keyword-based and labelled NOT AI.
- Only the simulated mode was exercised here. Live-mode grouping uses the same `grouped()` code, and is covered for a single message by `live-flow.spec.ts`.
