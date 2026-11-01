# UI-06 — Day 4 accessibility qualification (Phase A)

**Status:** `DAY4_PHASE_A_ACCESSIBILITY_READY_FOR_ARCHITECT_REVIEW`. This is **not** a WCAG 2.2 AA conformance claim.

**Branch:** `day4/eval04a-ui06-qualification` (base `1991ec0`).

## Outcome

- **A11Y-04 corrected.** Button/summary focus rings went from 2.60–2.79:1 to 5.86–6.29:1, and the sidebar is unchanged at 6.03:1. It awaits owner visual acceptance as `UX-A11Y-04_PENDING_OWNER_VISUAL_ACCEPTANCE`.
- **UX-A11Y-01/02/03 preserved:** `a11y-ui06a.spec.ts` 10/10.
- **WCAG matrix (55 A/AA criteria):** 26 PASS, **2 FAIL** (1.4.3, 1.4.11), 7 NOT_VERIFIED, 20 NOT_APPLICABLE.
- **New open findings:** A11Y-05 (checkbox ring), A11Y-06 (text contrast), A11Y-07 (field borders), A11Y-08 (glyph icons). None is fixed, because each needs separate authorization.
- **Not verified:** screen reader, Firefox/WebKit/Safari, real 200% zoom and OS high contrast. See `manual-test-guide.md`.

## Files

| File | Content |
|---|---|
| `accessibility-audit.md` | Environment, sampled states, full criterion matrix, summary |
| `findings-register.md` | A11Y-04…08, A11Y-R1: reproduction, measurement, proposed minimal fixes, gates |
| `a11y-04-measurements.md` | Before/after contrast, geometry, parity (including the existing 212-case suite) |
| `visual-exception-ux-a11y-04.md` | Proposed exception and the owner decision field |
| `manual-test-guide.md` | Owner steps for VoiceOver, Safari/Firefox, real zoom, high contrast |
| `*-before.jsonl` / `*-after.jsonl` | Raw measurements. `before` is the unmodified stylesheet; `after` includes A11Y-04 |
| `a11y-04-parity.jsonl` | Focused / reference+override / unfocused pixel diffs |
| `screenshots/` | `before-*` and `after-*` focus, reflow and forced-colours captures; `a11y04-parity-*` app/reference crops; A11Y-05 capture |

## Tests

`test/visual/a11y-day4-ui06.spec.ts`:
- Tab walk across 6 states × 2 viewports: visibility, obscuring and 3:1 for A11Y-04.
- Reflow at 320 and 720.
- Text spacing.
- Target size.
- Emulated forced colours.
- Mobile keyboard order.
- A11Y-05 pin.
- Text-contrast scan.
- Keyboard-only full workflow at 1440 and 390.

`test/visual/a11y-04-parity.spec.ts`: 12 focused parity cases with the reference+override control.

**Evidence regeneration:** `UI06_STAGE=after` and `A11Y04_PARITY=1`. Without the variables, the specs only assert.

## Provenance

Everything here is an automated Chromium measurement or Claude's inspection of code and screenshots. **There are no manual assistive-technology observations.**
