# UI-06A — Accessibility findings: before → after

| ID | Found | Before (reproduction) | Correction | After | Status |
|---|---|---|---|---|---|
| A11Y-01 | AI-02 (`47ca9c7`) | Fields and draft editor compute `outline: none` on keyboard focus (`focus-measurements-before.jsonl`) | UX-A11Y-01 override stylesheet | 3px solid #4f46e5 at 4 widths; 6.29:1 | **Corrected**, pending owner visual acceptance |
| A11Y-02 | AI-02 (`test.fail` pin) | The CSV label shows no focus; the outline sits on the 1×1 input | UX-A11Y-02 `:has()` rule | Label ring at 4 widths. Enter opens the native chooser. Validation works. Pin converted to a regular test. | **Corrected**, pending owner visual acceptance |
| A11Y-03 | AI-02 (asserted group count 0) | No accessible group. The new group test **failed** on the parent build ("toHaveCount" 0 ≠ 1). | `role="group"` + `aria-labelledby` | `group "Secondary intents"`, 5 named checkboxes, checked states exposed, Space toggles, options follow the primary | **Corrected** |
| "Review status" label | REQ-03 / directive §6 | `<label>Review status</label>` has no associated control (it labels a static `div.notice`) | **Not changed.** Only `.field label` carries the visual style, so a non-label element would need duplicated CSS. Adding `role`/`aria-labelledby` to the div would give it a live-region or name semantics that it doesn't need. A dangling `<label>` is read as plain text and causes no functional harm. | Unchanged | **Assessed: deferred to formal UI-06** (low impact) |
| A11Y-04 (new) | UI-06A measurement | Frozen button/link/summary focus ring #8a91fb = 2.79:1 on white (< 3:1, 1.4.11) | Not in scope (buttons were explicitly excluded) | Unchanged | **Open → formal UI-06** |

## Workflow regression (reused + new)

| Journey | Evidence | Result |
|---|---|---|
| Import: keyboard reaches CSV, focus visible, native selection and validation | `a11y-ui06a.spec.ts` (CSV × 4 widths; Enter → filechooser → preview); `a11y-preliminary.spec.ts` keyboard-only | Pass |
| Inbox: queue items and filters reachable; groups understandable | `a11y-preliminary.spec.ts`; `grouping-req03.spec.ts`; filter focus in `a11y-ui06a.spec.ts` | Pass |
| Review: correct intents, editor keeps focus, edit → Pending, unsafe stays blocked, recheck doesn't approve | `review-flow.spec.ts` (editor focus, primary swap keeps focus); `a11y-ui06a.spec.ts` group test; `live-flow.spec.ts` R1/R2/AI-02 R1 | Pass |
| Results: keyboard navigation and CSV export | `results-flow.spec.ts` "Results empty state, keyboard download and navigation" | Pass |
| Mobile 390: detail → edit/correct → back to list, no dead end | `grouping-req03.spec.ts` mobile; `inbox-flow.spec.ts`; UX-04-01 tests; `a11y-ui06a.spec.ts` @390/@320 | Pass |

**Screen reader: NOT VERIFIED — HANDOFF TO FORMAL UI-06.** No screen reader was run. VoiceOver exists on this Mac, but an interactive session was not available to this agent.

**Not tested:** Safari and Firefox, forced-colours mode, 200% zoom and reflow, contrast of text.

**No WCAG 2.2 AA conformance claim is made.**
