# UI-06 — WCAG 2.2 A/AA-targeted accessibility assessment (Day 4, Phase A)

**Status:** `ASSESSMENT_COMPLETE_WITH_FAILURES_AND_UNVERIFIED_ITEMS`. **This is not a conformance claim.**
- Two AA criteria FAIL.
- Seven criteria are NOT_VERIFIED, because no screen reader, Firefox, WebKit or real browser zoom was available.

**Normative reference:** W3C WCAG 2.2 (https://www.w3.org/TR/WCAG22/). 4.1.1 Parsing is obsolete in 2.2 and is omitted.

**Approach:** consistent with WCAG-EM (https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/):
- **Scope:** the single-page app at `/` in simulated mode. Live mode shares the same components; its differences are mode copy only (Day 2 UX-AI-01).
- **Sample:** every view and state below.
- **Audit:** automated Chromium checks, code inspection, and Claude's inspection of screenshots.
- **Report:** this file.

## Environment actually used

| Item | Value |
|---|---|
| Browser | Playwright Chromium (bundled with `@playwright/test` 1.64.1), headless, `deviceScaleFactor` 1, macOS (Darwin 25.6.0) |
| Viewports | 1440×900 and 390×844 (keyboard, focus, target size, text spacing); 320×640 (reflow); 720×450 (the CSS-pixel layout equivalent of 200% zoom on 1440×900, **not real browser zoom**) |
| Firefox / WebKit / Safari | **NOT_VERIFIED.** Not installed locally; no download was made (disk headroom about 2 GiB) |
| Screen reader | **SCREEN_READER_NOT_VERIFIED.** No interactive VoiceOver session was available to Claude. The Playwright accessibility tree is not a screen-reader test |
| Forced colours | Chromium **emulated** `forced-colors: active` only. Windows High Contrast was not tested |
| Build | `next build` of branch `day4/eval04a-ui06-qualification` (base `1991ec0`, plus the A11Y-04 override); `next start` on 127.0.0.1:3100 (Playwright `simulated` project) |

## Views and states sampled

Spec: `test/visual/a11y-day4-ui06.spec.ts`, `STATES`.

| State id | Covers |
|---|---|
| `import-empty` | Import empty state, CSV control, manual message entry |
| `import-preview-errors` | Sample loaded with CSV validation errors (invalid and duplicate rows) and the preview table |
| `inbox-review` | Grouped inbox, primary and secondary intent correction, draft editor, approve/reject, original-output disclosure |
| `inbox-blocked` | Blocked-draft safety notice, recheck, historical-finding disclosure |
| `inbox-failed-retry` | Failed-only queue and single retry |
| `results` | Results after one approval, CSV export |
| keyboard workflow | Import → Inbox → Review → edit → Approve → Results → CSV download, using the keyboard only |
| Processing/loading | Covered by the existing `role="status"` assertions in `retry-flow.spec.ts` and `import-flow.spec.ts`. Not re-sampled for focus |
| Mobile navigation, empty filters | 390 px runs of every state above; the empty-filter state is covered by the existing `inbox-flow.spec.ts` |

## Criterion matrix

**Evidence paths** are relative to `docs/evidence/day4-ui06/` unless stated. "Spec" means `test/visual/a11y-day4-ui06.spec.ts`.

**Severity scale:** P1 blocks a core task for some users; P2 is a significant barrier with a workaround; P3 is minor.

### Level A

| SC | Name | Verdict | View/state · viewport | Method | Observation | Evidence | Sev. | Limitation / follow-up |
|---|---|---|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | NOT_VERIFIED | all · 1440/390 | code inspection | Decorative SVGs are `aria-hidden`. Text glyph icons (`◷ ! ✦ ▣ ◫ ✎`) in metric and heading icons are **not** hidden and may be announced | `src/components/*.tsx`; `text-contrast-after.jsonl` (rows `metric-icon`, `heading-icon`) | P3 | VoiceOver check (manual guide §3) |
| 1.2.1–1.2.3 | Audio/video (prerecorded) | NOT_APPLICABLE | — | inspection | No media | — | — | — |
| 1.3.1 | Info and Relationships | NOT_VERIFIED | all | DOM inspection + role queries | Form fields are labelled; the secondary-intent group is named (UX-A11Y-03); the table uses `th`; landmarks are present. The static `<label>Review status</label>` has no control (documented, not redesigned; A11Y-R1) | `src/components/CandidateReview.tsx:80`; Day 3 `day3-ui06a/` | P3 | Screen-reader confirmation |
| 1.3.2 | Meaningful Sequence | NOT_VERIFIED | inbox-review · 390 | Tab order forward and reverse | DOM and focus order follow the visual order; reverse order mirrors forward | `keyboard-order-after.jsonl` | — | Reading order with a screen reader not verified |
| 1.3.3 | Sensory Characteristics | PASS | all | copy inspection | Instructions do not rely on shape, location or sound ("Jump to reply ↓" also names its target) | screenshots | — | — |
| 1.4.1 | Use of Color | PASS | inbox, results | screenshot inspection (Claude) | Attention, blocked, approved and failed states carry text labels and badges, not colour alone | `screenshots/after-inbox-*-last-stop.png` | — | Claude inspection, not an independent check |
| 1.4.2 | Audio Control | NOT_APPLICABLE | — | — | No audio | — | — | — |
| 2.1.1 | Keyboard | PASS | full workflow · 1440 and 390 | Tab / Shift+Tab / Enter / Space only | Import → Process → Reveal → select → edit draft → Approve → Results → **CSV download** completed at both widths | `keyboard-workflow-after.jsonl`; spec "complete workflow is operable by keyboard alone" | — | Chromium only |
| 2.1.2 | No Keyboard Trap | PASS | 6 states × 2 viewports | Tab walk until focus wraps; mobile reverse walk | Focus always wrapped (169 stops); no trap in mobile review | `focus-stops-after.jsonl`, `keyboard-order-after.jsonl` | — | — |
| 2.1.4 | Character Key Shortcuts | NOT_APPLICABLE | — | code search | No key handlers or access keys (`grep onKeyDown/keydown/accessKey`: none) | — | — | — |
| 2.2.1 | Timing Adjustable | NOT_APPLICABLE | — | inspection | No user time limits (the live-request timeout bounds the server call, not user input) | — | — | — |
| 2.2.2 | Pause, Stop, Hide | NOT_APPLICABLE | — | CSS inspection | No moving or auto-updating content; transitions only; `prefers-reduced-motion` honoured | `src/styles/hifi-v1.1.css` | — | — |
| 2.3.1 | Three Flashes | PASS | all | inspection | Nothing flashes | — | — | — |
| 2.4.1 | Bypass Blocks | PASS | all | landmark inspection | `aside` with `nav`, `main`, `header`, `footer` landmarks (ARIA11); no skip link | `src/components/AppShell.tsx` | — | Landmark navigation not verified with a screen reader |
| 2.4.2 | Page Titled | PASS | all | DOM | `<title>Candidate Inbox — Hi-fi V1.1 \| MUST Quest Concept</title>` | `src/app/layout.tsx` | — | One title for all views (single-page app) |
| 2.4.3 | Focus Order | PASS | 6 states × 2 viewports | Tab walk | The order follows reading order; focus moves to the review pane on selection (existing behaviour) | `focus-stops-after.jsonl` | — | — |
| 2.4.4 | Link Purpose | NOT_APPLICABLE | — | DOM | No links (`a[href]`: none found); navigation uses buttons | — | — | — |
| 2.5.1 | Pointer Gestures | NOT_APPLICABLE | — | — | No path or multipoint gestures | — | — | — |
| 2.5.2 | Pointer Cancellation | PASS | all | inspection | Native `button` activation fires on up-event | — | — | — |
| 2.5.3 | Label in Name | PASS | all | DOM / role names | Accessible names are the visible text (role queries by visible text succeed throughout the suites); the `title` on Reset is a description | existing specs (`getByRole(..., { name })`) | — | — |
| 2.5.4 | Motion Actuation | NOT_APPLICABLE | — | — | — | — | — | — |
| 3.1.1 | Language of Page | PASS | — | DOM | `<html lang="en">` | `src/app/layout.tsx:13` | — | — |
| 3.2.1 | On Focus | PASS | 6 states × 2 | Tab walk | Focusing causes no change of context | `focus-stops-after.jsonl` | — | — |
| 3.2.2 | On Input | PASS | inbox | existing flows | Filter, intent and draft changes update content in place, without a change of context | `inbox-flow.spec.ts`, `review-flow.spec.ts` | — | — |
| 3.2.6 | Consistent Help | NOT_APPLICABLE | — | — | No help mechanism | — | — | — |
| 3.3.1 | Error Identification | PASS | import-preview-errors | existing tests + screenshot | Invalid and duplicate rows are identified in text per row (e.g. missing message, duplicate ID) | `test/visual/import-flow.spec.ts`; `screenshots/after-import-preview-errors-*` | — | — |
| 3.3.2 | Labels or Instructions | PASS | import, review | DOM | Visible labels; `*` required marker with "Required:" instructions | `src/components/ImportWorkspace.tsx` | — | — |
| 3.3.7 | Redundant Entry | NOT_APPLICABLE | — | — | No multi-step re-entry | — | — | — |
| 4.1.2 | Name, Role, Value | NOT_VERIFIED | all | role queries; DOM | Native controls throughout; no defects found by automated role and name queries | existing specs | — | Assistive-technology confirmation required (manual guide §3) |

### Level AA

| SC | Name | Verdict | View/state · viewport | Method | Observation | Evidence | Sev. | Limitation / follow-up |
|---|---|---|---|---|---|---|---|---|
| 1.2.4, 1.2.5 | Captions (live) / Audio description | NOT_APPLICABLE | — | — | No media | — | — | — |
| 1.3.4 | Orientation | PASS | — | CSS inspection | No orientation lock or `orientation` media query | `src/styles/*.css` | — | Device rotation not tested |
| 1.3.5 | Identify Input Purpose | NOT_APPLICABLE | — | — | The fields describe *other* people's messages, not the user's own data | — | — | — |
| **1.4.3** | **Contrast (Minimum)** | **FAIL** | all · 1440/390 | computed colour vs composited background, 884 text rows | Frozen V1.1 tokens below 4.5:1. Examples: footer 2.63, work-toolbar sub-line 2.80, preserved-output `readback` 3.13, "Human-editable" label 3.25, table headers 3.64, avatar initials 3.75, eyebrow 4.25, sidebar fine print 4.29, **"Reject draft" 4.29**, queue count 4.45 | `text-contrast-after.jsonl` | P2 | **A11Y-06** (findings register). The fix needs frozen-token overrides and a new authorization |
| 1.4.4 | Resize Text | NOT_VERIFIED | 6 states · 720×450 | CSS-px layout equivalent | No page-level horizontal overflow at 720 CSS px | `reflow-after.jsonl` (720) | — | **Real 200% browser zoom not performed** (manual guide §4) |
| 1.4.5 | Images of Text | PASS | all | inspection | All text is live text | — | — | — |
| 1.4.10 | Reflow | PASS | 6 states · 320×640 | `scrollWidth ≤ clientWidth` | 0 px page-level overflow in all 6 states | `reflow-after.jsonl`, `screenshots/after-reflow-*-320.png` | — | Chromium only |
| **1.4.11** | **Non-text Contrast** | **FAIL** | inbox, import · 1440 | computed focus-indicator colour vs adjacent background; CSS token measurement | **A11Y-04 corrected:** button and summary focus rings 2.60–2.79 → 5.86–6.29. **A11Y-05 open:** "Needs attention only" checkbox focus ring 2.79:1. **A11Y-07 open:** text input, select and draft-editor borders 1.30–1.35:1 on white | `focus-stops-*.jsonl`, `a11y05-checkboxes-after.jsonl`, `a11y-04-measurements.md` | P2 | A11Y-05 and A11Y-07 need separate authorization |
| 1.4.12 | Text Spacing | PASS | 6 states × 2 | WCAG spacing override injected; overflow and clipped-text heuristic | No page overflow; no clipped text in `overflow: hidden` boxes (ellipsis subjects excluded by design) | `text-spacing-after.jsonl` | — | Heuristic, plus Claude review of screenshots |
| 1.4.13 | Content on Hover or Focus | PASS | all | inspection | No author tooltips or popovers. The native `title` on Reset is user-agent controlled | — | — | — |
| 2.4.5 | Multiple Ways | NOT_APPLICABLE | — | — | A single page with views, not a set of pages | — | — | — |
| 2.4.6 | Headings and Labels | PASS | all | DOM | One `h1` per view; descriptive labels. The "Review status" caption is descriptive (A11Y-R1) | — | — | — |
| 2.4.7 | Focus Visible | PASS | 6 states × 2 · 169 stops | `:focus-visible` + outline present | Every keyboard stop has a visible outline (forced-colours emulation: 38/38) | `focus-stops-after.jsonl`, `forced-colors-after.jsonl` | — | Contrast of the checkbox ring is assessed under 1.4.11 |
| 2.4.11 | Focus Not Obscured (Minimum) | PASS | 6 states × 2 | in-viewport + `elementFromPoint` at the centre | 169/169 stops in the viewport and not covered | `focus-stops-after.jsonl` | — | Centre-point heuristic |
| 2.5.7 | Dragging Movements | NOT_APPLICABLE | — | — | No dragging | — | — | — |
| 2.5.8 | Target Size (Minimum) | PASS | 6 states × 2 | bounding boxes | Undersized: 15×15 checkboxes (the wrapping label is the target) and summaries 20 px high and full width (spacing exception) | `target-size-after.jsonl` | — | — |
| 3.1.2 | Language of Parts | NOT_APPLICABLE | — | — | English only | — | — | — |
| 3.2.3 | Consistent Navigation | PASS | all | inspection | Same navigation in every view | — | — | — |
| 3.2.4 | Consistent Identification | PASS | all | inspection | Same controls are named consistently | — | — | — |
| 3.3.3 | Error Suggestion | NOT_VERIFIED | import-preview-errors | inspection | Errors state the problem (e.g. "Missing message"); whether every message suggests a fix was not assessed per row | `import-flow.spec.ts` | — | Owner review |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | NOT_APPLICABLE | — | — | No legal or financial commitments; nothing is sent; decisions are reversible | — | — | — |
| 3.3.8 | Accessible Authentication (Minimum) | NOT_APPLICABLE | — | — | No authentication | — | — | — |
| 4.1.3 | Status Messages | NOT_VERIFIED | processing, retry, approve | DOM + existing tests | `#globalLive` (`role=status`, polite, atomic), `#processingIndicator` and `#liveProcessingStatus` (`role=status`), and the `aria-live` draft-change indicator carry the expected text | `src/app/layout.tsx:16`, `retry-flow.spec.ts`, `review-flow.spec.ts` | — | Announcement not verified with a screen reader |

## Summary

| Verdict | Level A (31) | Level AA (24) | Total (55) |
|---|---|---|---|
| PASS | 15 | 11 | 26 |
| FAIL | 0 | 2 (1.4.3, 1.4.11) | 2 |
| NOT_VERIFIED | 4 (1.1.1, 1.3.1, 1.3.2, 4.1.2) | 3 (1.4.4, 3.3.3, 4.1.3) | 7 |
| NOT_APPLICABLE | 12 | 8 | 20 |

**Conformance:** not claimed. There are two AA failures, and the screen-reader, real-zoom and cross-browser checks are outstanding.

**Provenance:** every PASS above is either a Chromium automated measurement or Claude's inspection of code and screenshots. None is a manual assistive-technology observation.
