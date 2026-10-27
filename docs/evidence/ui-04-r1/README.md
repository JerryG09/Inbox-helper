# UI-04 R1 — UX-04-01 evidence

## Owner authorization
On 27 Oct 2026 ("UI-04 R1", Option 2) the owner **APPROVED** an explicit behavioral correction to the approved Hi-fi V1.1 prototype: when the mobile detail has no selected record left after a review decision or filter transition, return to the message list automatically.
- No new screen, no empty-card redesign, no navigation change.
- The frozen references (`reference/`) and the earlier evidence (`docs/evidence/ui-04/`, recorded at `1836dae`) are unchanged.

## Exact behavioral difference (UX-04-01)
| | Approved V1.1 (unmodified) | App with UX-04-01 |
|---|---|---|
| ≤900 px, last Pending draft approved/rejected | Detail stays open with an empty "Select a message" card. The list, filters and completion state are hidden and there is no way back. | Detail closes and the list returns, showing the existing "All AI-completed messages reviewed" card with accurate counts and the existing "Review batch results →" button. |
| ≤900 px, filter change leaves no visible selection | Same dead-end risk. | List shown. |
| A Pending record remains | Auto-advance to it. | Unchanged: auto-advance to it, detail stays open. |
| >900 px (desktop) | — | Unchanged. `mobileDetail` has no visual effect above 900 px; the 1440 cases remain 0 px against the unmodified HTML. |

- **Implementation:** a single central invariant, `normalizeView()` in `src/lib/inbox/inbox.ts`, applied wherever the inbox view changes (`setInboxView` in `src/app/page.tsx`). No per-button fixes.
- **What it never changes:** records, drafts, original AI output, history, and the view (no automatic navigation to Results).

## Parity (`parity-report.json`)
- **176 of 176 gated cases at 0 differing pixels**, no horizontal overflow.
- **170 unaffected cases:** compared with the unmodified approved HTML, exactly as before, still 0 px.
- **6 UX-04-01 cases:** `review-all-reviewed` and `review-all-reviewed-show-all` at 390/320/768.
  - **Gate:** compared with the unchanged approved HTML after applying the same correction to the prototype's own state (`state.mobileDetail = false; render()`). This shows the corrected screen uses only existing approved components and layout. All 6 are at 0 px.
  - **Recorded difference from the unmodified HTML** (asserted non-zero, so the exception can't silently disappear):

    | Width | App (px tall) | Unmodified approved (px tall) |
    |---|---|---|
    | 390 | 1393 | 949 (dead-end card) |
    | 320 | 1473 | 879 |
    | 768 | 1212 | 1089 |

  - `review-all-reviewed-show-all` at ≤900 px **cannot be reached** in the unmodified design, and is recorded as such. At 1440 px it remains a normal unmodified comparison.
- **No relaxation:** no threshold was weakened and no case was deleted. The previous desktop-only restriction on `review-all-reviewed-show-all` was removed, so coverage grew by 3 cases.

**Screenshots:** `*.app-UX-04-01.png` show the corrected app; `*.approved-unmodified.png` show the unmodified approved HTML after the same user steps.
