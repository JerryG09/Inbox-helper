# UI-06C — Before/after measurements

**Before:**
- Phase A at `5a951f5`, i.e. the owner-accepted appearance including A11Y-04.
- Data: `docs/evidence/day4-ui06/*-after.jsonl` (accepted Phase A, not rewritten).

**After:** this branch (`day4/ui06c-contrast-remediation`), Chromium, simulated mode.

## A11Y-05 (focus indicator, 1.4.11)

| Viewport | Before | After | Width / offset | Unfocused | Clipped |
|---|---|---|---|---|---|
| 1440×900 | 2.79:1 (`#8a91fb` on `#fff`) | **6.29:1** (`#4f46e5`) | 3px / 3px | outline none | no |
| 390×844 (list view) | not reached at 390 in Phase A (list hidden behind the detail) | **6.29:1** | 3px / 3px | outline none | no |
| 320×700 (list view) | — | **6.29:1** | 3px / 3px | outline none | no |

Data: `a11y05.jsonl`. Screenshots: `screenshots/after-a11y05-focus-{1440,390,320}.png`. The Phase A "before" is `docs/evidence/day4-ui06/screenshots/after-a11y05-needs-attention-only-1440.png`.

## A11Y-06 (text, 1.4.3)

See `contrast-inventory.md`: per-selector before and after, 2.30–4.45 → 4.60–4.66.

**Rendered scan:** 1,748 rows, 8 states × 3 viewports, opacity-aware, measured at rest. **0 non-exempt failures.** Data: `text-contrast.jsonl`.

## A11Y-07 (field boundaries, 1.4.11)

| Control | Before | After (vs inside / outside) | Focus border | Focus outline |
|---|---|---|---|---|
| `#manual-id`, `#manual-name`, `#manual-subject` | 1.30 | **3.13 / 3.13** | `#8992f0` (frozen, unchanged) | `3px #4f46e5` (UX-A11Y-01) |
| `#manual-message` | 1.30 | **3.13 / 3.13** | unchanged | unchanged |
| `#draftEditor` | 1.30 | **3.13 / 3.13** | unchanged | unchanged |
| selects (`#primaryIntent`, filters) | 1.21–1.30 | unchanged (boundary not the identifying cue) | unchanged | unchanged |

The figures hold at all 3 viewports. Data: `field-boundaries.jsonl`.

## Geometry and unrelated presentation

`ui06c-parity-classification.spec.ts`, all 212 legacy parity cases, threshold 0, no masks:

- **Isolation:** app vs approved HTML + the pre-UI-06C sheet.
  - Every case differs (1,428–5,463 px), because the footer and breadcrumb are on every page.
  - **0 differing pixels outside the boxes of UI-06C-targeted elements, in all 212 cases.**
  - **0 page-size changes.**
  - So nothing else changed, including layout geometry: a moved element would produce differences outside its own box.
- **Control:** app vs approved HTML + the whole override sheet.
  - **211/212 exactly 0 px.**
  - **1 case** (`import-empty-1440`): 12 px, max channel delta **1/255**, all at the rounded corners of the three re-coloured manual-entry fields. This is anti-aliasing residue with identical CSS, like the Day 3 R1 finding, and is **reported, not hidden**. The specs allow it only when it is ≤ 1/255 and inside a targeted element.

Data: `parity-classification.jsonl`.

**Investigated and resolved during this slice (method artefacts, recorded honestly):**
1. **`inbox-mobile-back-to-list-768`:** 73 px "outside targets" came from reading element boxes before the screenshot while the 768 px list was still laying out. The spec now reads the boxes after the capture, and the case reproduces at 0 outside.
2. **Waiting for CSS transitions to end** exposed a 1/255 difference on the corners of the untouched `.draft-badge` (results states at 390), again with identical CSS. The classification therefore keeps the legacy harness's capture timing; the text-contrast scan still waits for transitions, because it measures colours, not pixels.

## A11Y-04 preservation

`a11y-04-parity.spec.ts`, 12/12, now with an explicit `outsideRing === 0` assertion counting only focus-dependent pixels.
- The baseline is approved HTML + the UI-06C rules, so A11Y-04 is still isolated.
- Unfocused and control must be 0 px or ≤ 1/255 residue.

The owner-accepted UX-A11Y-04 appearance is unchanged. The A11Y-04 rules were not edited; all A11Y-04 focus measurements in `a11y-day4-ui06.spec.ts` pass (≥ 5.86:1).
