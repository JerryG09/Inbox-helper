# UI-06B — A11Y-04 before/after measurements

**Defect.** The frozen rule `button:focus-visible, a:focus-visible, …, summary:focus-visible { outline: 3px solid #8a91fb; outline-offset: 3px }` (`src/styles/hifi-v1.1.css:16`) is below the 3:1 non-text contrast reference (WCAG 1.4.11) for an author-styled focus indicator.

**Correction.** The correction is in `src/styles/ui-06a-accessibility.css` only. The frozen sheet and the prototype are byte-unchanged; `npm run verify:reference` passes.

```css
button:focus-visible, a:focus-visible, summary:focus-visible { outline-color: #4f46e5; }
.sidebar button:focus-visible, .sidebar a:focus-visible { outline-color: #8a91fb; }
```

- **What changed:** colour only. Width (3 px), offset (3 px), style and every unfocused, hover, pressed and disabled rule are untouched.
- **Why the sidebar is excluded:** `#4f46e5` would *reduce* contrast on the navy sidebar, from 6.03:1 to 2.68:1.
- **No links:** the product has no `<a>` links today. The `a` selector only mirrors the frozen rule.

## Measured contrast

**Method:** keyboard Tab walk, computed `outline-color` against the composited background behind the ring (the offset puts the ring on the parent background).

**Coverage:** 169 focus stops across 6 states × 2 viewports (1440×900, 390×844), Chromium.

**Data:** `focus-stops-before.jsonl` and `focus-stops-after.jsonl`.

| Control type | Adjacent background | Stops | Before | After |
|---|---|---|---|---|
| button (panel, list, review, decision bar) | `#ffffff` | 48 | `#8a91fb` **2.79:1** | `#4f46e5` **6.29:1** |
| button (page header/toolbar: Reset, Failed queue, Retry failed, View results) | `#f5f7fb` | 21 | `#8a91fb` **2.60:1** | `#4f46e5` **5.86:1** |
| summary (original-output / historical-finding disclosures) | `#ffffff` | 6 | **2.79:1** | **6.29:1** |
| button in the sidebar navigation (desktop and mobile top bar) | `#111d33` | 36 | 6.03:1 | 6.03:1 (unchanged by design) |
| input checkbox "Needs attention only" | `#ffffff` | 3 | 2.79:1 | 2.79:1, **out of scope → A11Y-05** |
| fields, selects, draft editor, CSV label (UX-A11Y-01/02) | `#ffffff` / `#f6f7ff` | 58 | 5.89–6.29:1 | unchanged |

**Other checks (after):**
- Visibility: 169/169 stops `:focus-visible` with a non-`none` outline.
- Obscuring: 169/169 in the viewport and not obscured (centre point).
- Clipping: no ring clipped by an overflow ancestor.
- Geometry: identical before and after for every sampled control (`focus-samples-*.jsonl`, `rect same`).

**Regression proof:**
- **Fails without the fix:** the spec's 3:1 assertion failed on the unmodified stylesheet. Measured: "Load 6-message sample" 2.79, "↺ Reset demo" 2.60, and others. This is recorded in the Phase A daily log.
- **Passes with the fix:** the assertion passes after the correction.

**Screenshots** (`screenshots/`):
- `before-focus-<control>-<width>.png` and `after-focus-<control>-<width>.png`.
- Controls: load-sample, reset, nav-inbox, approve, message-row, summary-original, summary-historical.
- Widths: 1440 and 390.
- The 390 message row is not visible while the review detail is open, so it is recorded as `visible: false`.

## Visual parity

**Spec:** `test/visual/a11y-04-parity.spec.ts`, threshold 0, no masks. **Data:** `a11y-04-parity.jsonl`; crops `screenshots/a11y04-parity-*`.

| Case | Focused diff (px) | Outside ring | Reference + override | Unfocused |
|---|---|---|---|---|
| import-load-sample-1440 / -390 | 1262 / 1262 | 0 / 0 | **0 / 0** | **0 / 0** |
| import-reset-1440 / -390 | 788 / 788 | 0 / 0 | 0 / 0 | 0 / 0 |
| sidebar-nav-inbox-1440 / -390 | **0 / 0** (unchanged colour) | 0 / 0 | 0 / 0 | 0 / 0 |
| review-approve-1440 / -390 | 882 / 1172 | 0 / 0 | 0 / 0 | 0 / 0 |
| review-summary-original-1440 / -390 | 4086 / 2196 | 0 / 0 | 0 / 0 | 0 / 0 |
| blocked-summary-historical-1440 / -390 | 4086 / 2196 | 0 / 0 | 0 / 0 | 0 / 0 |

- **Localisation:** every focused difference lies inside the ring box (element rect + offset + width + 1 px).
- **Control:** injecting *only* the override stylesheet into the reference reproduces the app exactly (0 px).
- **Ordinary state:** unfocused is 0 px.

**A first attempt that I discarded.** The first run used viewport-only captures without `scrollTo(0,0)`. It reported 4 failures caused by scroll-position differences between the pages, which were artefacts of my capture method:
- unfocused 390 review states about 144k px;
- an 8 px residue at summary-original-1440.

The corrected run aligns with the parity harness (`scrollTo(0,0)`, full page). The discarded output was deleted and regenerated; nothing was masked.

**Existing parity suite** (`npm run test:visual`, 30 Oct):
- 212 cases: **188 pass**.
- **24 fail**: the same 24 focused-editor and primary-intent states as Day 3. Their pixel counts are identical to Day 3 (24/24, compared line by line with `day3-ui06a/parity-focus-classification.jsonl`), and every unfocused state is 0 px.
- The suite never keyboard-focuses a button or summary, so **A11Y-04 adds no new difference to it**. Those 24 remain the owner-accepted UX-A11Y-01/02/03 exceptions (E-D3-20).
