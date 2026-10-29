# UI-06A R1 — Focused-state pixel difference investigation

**Branch and provenance:**
- Branch `day3/ui-06a-r1-focus-parity`, from the accepted UI-06A candidate `4c501c42cafe38ba6f3a6bf9952c9b0bc6ef5658`. `origin/main` = `6a23fe2`.
- Diagnostic and evidence only: **no production code or CSS changed.**
- Claude Code (`claude-opus-5-5`) ran everything here. Independent review is pending.

**Environment:**
- Playwright Chromium headless, project `simulated`, against the existing build of the UI-06A source (`git diff 9c22541 -- src` is empty, so no rebuild).
- The reference is the unchanged approved HTML.
- The parity harness `parity.spec.ts`, its thresholds and its cases are untouched.

**Command:** `UI06A_R1=1 npx playwright test test/visual/ui06a-r1-diff-localization.spec.ts --project=simulated` → **72 passed** (24 cases × 3 variants).

## Method (per case)
1. Replay the parity steps on the app and on the reference, let focus management settle (2 rAF + 100 ms), scroll to 0, and take a full-page screenshot.
2. Record the focused element and `:focus-visible`, its rect, outline width/offset/colour, border, shadow, document size, scroll position, and decision-bar rect/position/shadow/background — for **both** pages.
3. Build a strict zero-threshold `pixelmatch` mask.
4. **Permitted indicator region** = focused rect + (outline-offset + outline-width + 1 px antialiasing) on each side. Count inside and outside.
5. Cluster the outside pixels (6 px join), group them into crop regions (24 px join), and crop app / reference / mask at 3× for every region.
6. **Determinism:** the as-captured comparison is repeated 3 times.
7. **Experiments:**
   - (a) hide the caret in **both** pages;
   - (b) **control:** inject only `src/styles/ui-06a-accessibility.css` into the reference, then compare.

## Results (all 24 focus-dependent parity cases)

| States | Focused | Inside ring | Outside ring | Max outside Δ per channel | Deterministic | Caret hidden | **Reference + UI-06A CSS** |
|---|---|---|---|---|---|---|---|
| `review-primary-swap`, `review-primary-correct` × 1440/390/320/768 | `#primaryIntent` | 1,699–2,179 (= all) | **0** | — | yes (3×) | identical | **0 px** |
| `review-empty-draft` × 4 | `#draftEditor` | 2,161–4,741 | 238 (1440) · 876–878 | 1–2 | yes | identical | **0 px** |
| `review-approved-filter-then-edit` × 4 | `#draftEditor` | 2,161–4,741 | 310 (1440) · 875–882 | 1–4 | yes | identical | **0 px** |
| `review-blocked-edited` × 4 | `#draftEditor` | 2,161–4,741 | 268 (1440) · 901–904 | 2–3 | yes | identical | **0 px** |
| `review-blocked-reintroduced` × 4 | `#draftEditor` | 2,161–4,740 | 268 (1440) · 901–904 | 2–3 | yes | identical | **0 px** |

Per-case figures, clusters with coordinates and counts, and crop regions are in `diff-localization.json`.

**Correction to the UI-06A note:** the earlier "~504 px" figure for `review-empty-draft-1440` used a rough 6 px box. The precise outside count is **238**.

## Where the outside pixels are, and what they show
- **Location:**
  - At 1440: small clusters (3–15 px) on the rounded corners and edges of the decision-bar buttons ("Reject draft", "Approve draft", "Next pending") and on glyph edges in that area.
  - At 390, 320 and 768: mostly glyph edges of the text line below the editor, e.g. "Draft changed. Review pending.", plus button corners.
- **Content:** identical shapes, text and colours. Only antialiased edge pixels differ, by **1–4 out of 255** per channel, which is not perceptible.
- **Examples:**
  - `screenshots/example-button-corner-1440-app-reference-mask.png`
  - `screenshots/example-status-text-390-app-reference-mask.png`
  - Panels in each example: app | reference | mask, at 3×.
- **Full set:** `screenshots/<case>-as-captured-outside<N>-{app,reference,diffmask}.png` covers every outside region of every case: 127 regions, 381 images.

## Causes tested
| Hypothesis | Test | Result |
|---|---|---|
| Caret rendering or blink | `caret-color: transparent` in both pages | **Rejected**: identical counts |
| Timing or screenshot synchronisation | 3 repeated captures per case | **Rejected**: identical counts every time |
| Focus modality / wrong element focused | `activeElement` + `:focus-visible` recorded | Same element, `:focus-visible` true in both pages |
| Layout, scroll, geometry or style change elsewhere in the product | Rects, doc size, scroll, decision-bar styles compared | **Identical** in app and reference |
| Product DOM or behaviour differs | **Control:** reference + UI-06A stylesheet only | **0 px in all 24 cases**: the entire difference, inside and outside the ring, is produced by the UI-06A focus CSS |

**Root cause:**
- **Established:** the outside pixels are a rendering side effect of painting the new focus outline. With that stylesheet present, the unchanged approved HTML reproduces the app pixel-for-pixel.
- **Plausible but not established:** the exact Chromium mechanism. It is most likely re-rasterisation of the paint/raster region invalidated by the outline, producing slightly different antialiasing on nearby edges. I did not verify this at the compositor level.

## Determination
- **No product behaviour or presentation changed** beyond the intended focus indicator. The DOM, layout, styles and unfocused rendering are identical, and the unfocused captures are 0 px (UI-06A `ui06a-parity-focus.spec.ts`).
- All 24 cases: **`EXPLAINED_ACCESSIBILITY_EXCEPTION`**. Each has an in-ring difference only, or deterministic 1–4/255 edge antialiasing that disappears when the reference gets the same CSS.

**Remaining uncertainty:**
- The compositor-level mechanism, as above.
- Only Chromium was tested; other browsers may antialias differently.
- **Owner visual acceptance of UX-A11Y-01/02/03 is still required.**
