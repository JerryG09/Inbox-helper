# UI-06C — Bounded contrast remediation (A11Y-05 / A11Y-06 / A11Y-07)

**Status:** `DAY4_UI06C_READY_FOR_ARCHITECT_AND_OWNER_VISUAL_REVIEW`.

**Branch:** `day4/ui06c-contrast-remediation`, from `5a951f50635d3a08c2d453c555822cc782093d5f`.

**What changed:**
- **Source:** `src/styles/ui-06a-accessibility.css` only. The frozen `hifi-v1.1.css` and `reference/` are unchanged; `npm run verify:reference` passes.
- **Owner decision recorded:** UX-A11Y-04 is OWNER_VISUALLY_ACCEPTED (30 Oct). It was appended to `docs/evidence/day4-ui06/visual-exception-ux-a11y-04.md`.
- **Pending:** UX-A11Y-05, -06 and -07 await owner visual acceptance (`visual-exceptions.md`).

## Files

| File | Content |
|---|---|
| `contrast-inventory.md` | Every corrected selector: colour, background and ratio before and after; exemptions; the A11Y-07 necessity analysis |
| `before-after-measurements.md` | A11Y-05/06/07 results, geometry proof, A11Y-04 preservation, artefacts investigated |
| `visual-exceptions.md` | Proposed UX-A11Y-05/06/07 and owner decision fields |
| `parity-classification.jsonl` | All 212 legacy parity cases: control, isolation, unmodified |
| `text-contrast.jsonl`, `field-boundaries.jsonl`, `a11y05.jsonl`, `crops.jsonl` | Raw measurements |
| `screenshots/` | `before-*` / `after-*` crops at 1440 and 390 for every target; A11Y-05 focus at 1440, 390 and 320 |
| `full-suite-outputs/` | Files the legacy suite rewrote during this slice's run. **The originals were restored by `git checkout`**; these copies are this run's outputs, kept separately |

## Tests (Chromium, simulated mode; no provider calls)

| Gate | Result |
|---|---|
| `npm run verify:reference` | PASS |
| `npm run lint`, `npm run typecheck`, `npm run build` | exit 0 |
| `npm test` | 17 files, 339 passed + 9 expected-fail safety pins (unchanged from Day 3) |
| `a11y-ui06c.spec.ts` (new) | 9/9 assertions (A11Y-05/06/07 × 1440/390/320), plus 2 evidence-only crop tests |
| `a11y-day4-ui06.spec.ts` (A11Y-04, keyboard-only workflow, focus visibility and obscuring, reflow, text spacing, target size, forced colours; A11Y-05 now a normal regression) | 34/34 |
| `a11y-ui06a.spec.ts` (UX-A11Y-01/02/03) | 10/10 |
| `a11y-04-parity.spec.ts` (hardened: `outsideRing === 0`) | 12/12 |
| `ui06c-parity-classification.spec.ts` (all 212 legacy cases) | 212/212 |
| `npm run test:visual` (full, 30 Oct) | 666 tests: 413 passed, 251 failed, 2 skipped; classified below |

### Full-suite failures, classified

| Failures | Spec | Classification |
|---|---|---|
| 212 | `parity.spec.ts` (gate: app vs **unmodified** approved HTML = 0 px) | **Expected by design.** UI-06C changes unfocused colours on every page (footer and breadcrumb). The classification spec explains every pixel: 212/212 isolate to UI-06C-targeted elements, and the control is exact except one ≤ 1/255 residue. This includes the 24 Day 3 owner-accepted focus cases |
| 24 | `ui06a-parity-focus.spec.ts` (Day 3: "unfocused presentation is pixel-identical" to unmodified HTML) | **Expected by design**, for the same reason. These are the owner-accepted UX-A11Y-01/02/03 states; their unfocused assertion no longer holds once UX-A11Y-06/07 are applied |
| 15 | `retry-flow` (1), `ui06a-r1` (4), `a11y-day4-ui06` (1), `a11y-ui06c` (2), `ui06c-parity-classification` (7) | **Run-environment timeouts.** Each was a 30 s timeout or a closed browser; the run took 7.3 h of wall clock while the machine slept. **All re-run green in isolation** (retry-flow 4/4, R1, a11y, and the 7 classification cases) |

**No functional regression** was found.

**Pending decision:** once the owner accepts UX-A11Y-05/06/07, the legacy zero-pixel gate (`parity.spec.ts`) and the Day 3 focus spec need an authorized update to compare against the approved HTML + override sheet. That is not done here, because changing an accepted harness needs its own instruction.

## WCAG 2.2 A/AA matrix after remediation (Chromium; no conformance claim)

The Phase A matrix (`docs/evidence/day4-ui06/accessibility-audit.md`) is unchanged as history. Changes from it:

| SC | Phase A | Now | Basis |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | FAIL | **PASS (automated)** | 1,748 rows, 0 non-exempt failures. Exemptions: decorative glyphs (A11Y-08), inactive controls, gradient text (manual check recommended) |
| 1.4.11 Non-text Contrast | FAIL | **PASS (automated + analysis)** | Focus rings: buttons and summaries 5.86–6.29 (A11Y-04), checkbox 6.29 (A11Y-05), fields 6.29 (UX-A11Y-01). Essential text-field boundaries 3.13 (A11Y-07). Select boundaries judged non-essential (native arrow + value); owner may choose to include them |

| Verdict | Level A (31) | Level AA (24) | Total (55) |
|---|---|---|---|
| PASS | 15 | 13 | **28** |
| FAIL | 0 | 0 | **0** |
| NOT_VERIFIED | 4 (1.1.1, 1.3.1, 1.3.2, 4.1.2) | 3 (1.4.4, 3.3.3, 4.1.3) | **7** |
| NOT_APPLICABLE | 12 | 8 | **20** |

**Still NOT_VERIFIED:**
- screen reader (VoiceOver);
- Safari, Firefox and WebKit;
- real browser zoom;
- OS high contrast (only Chromium-emulated forced colours were tested).

**Still open, not implemented:** A11Y-08 (glyph icons exposed to assistive technology) and A11Y-R1 ("Review status" label semantics).

**WCAG 2.2 AA conformance is not claimed.**
