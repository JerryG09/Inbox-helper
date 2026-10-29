# UI-06A — Focus measurements and contrast

**How measured:**
- Tool: Playwright Chromium headless (simulated mode).
- Viewports: 1440×900, 1280×720, 390×844, 320×700.
- Method: focus was reached with real `Shift+Tab` / `Tab` presses, then `getComputedStyle()` and `getBoundingClientRect()` were read. Clipping was checked against every ancestor with non-visible overflow.
- Raw data: `focus-measurements-before.jsonl` (build from parent `02e81cf`) and `focus-measurements-after.jsonl` (UI-06A build).

## Computed focus state (identical at all four widths unless noted)

| Control | Before: focused | After: focused | Unfocused (before = after) |
|---|---|---|---|
| `#manual-id`, `#manual-name`, `#manual-subject`, `#manual-message` | `outline: none`; `box-shadow: rgba(108,117,242,0.11) 0 0 0 3px` | `outline: 3px solid rgb(79,70,229)`, offset 2px; shadow unchanged | `outline: none` |
| `#primaryIntent` | same as above (none + 0.11 shadow) | 3px solid #4f46e5, offset 2px | none |
| `#draftEditor` | same as above (none + 0.11 shadow) | 3px solid #4f46e5, offset 2px | none |
| `#processFilterSelect`, `#reviewFilterSelect` (desktop) | `3px solid rgb(138,145,251)` (#8a91fb), offset 3px | 3px solid #4f46e5, offset 2px | none |
| `label[for=csvFile]` while `#csvFile` is focused | `outline: none` (the 1×1 input carried the outline) | 3px solid #4f46e5, offset 3px; label 138×40 | none |

Clipping: `clippedByOverflowAncestor: false` for every control at every width, after the change.

## Contrast (WCAG 2.x relative luminance)

| Indicator | Adjacent colour | Ratio | 1.4.11 (≥ 3:1) |
|---|---|---|---|
| New #4f46e5 | panel / field surround #ffffff | **6.29:1** | Pass |
| New #4f46e5 | CSV upload area #f6f7ff | **5.89:1** | Pass |
| New #4f46e5 | field border #dbe2ee | 4.83:1 | Pass |
| Old shadow rgba(108,117,242,0.11) on #fff ≈ #f3f4fe | #ffffff | ≈ 1.1:1 | Fail (effectively invisible) |
| Frozen button/link ring #8a91fb (unchanged) | #ffffff | **2.79:1** | **Below 3:1**: new observation A11Y-04, not in scope |

## WCAG 2.2 references
- **2.4.7 Focus Visible (AA):** now met for the remediated controls by automated measurement.
- **1.4.11 Non-text Contrast (AA):** the new indicator is ≥ 5.89:1 against its adjacent colours.
- **2.4.11 Focus Not Obscured (Minimum) (AA):** no clipping by overflow ancestors was found. Sticky or overlay obscuring was not systematically tested beyond the clipping check.
- **2.4.13 Focus Appearance (AAA):** informative only. The 3px solid outline with 2–3px offset would likely satisfy its area and contrast-change guidance, but this is **not** claimed and is not an AA requirement.

These measurements do **not** establish WCAG 2.2 AA conformance for the product.

**Still needs manual verification:**
- The ring is perceptible to a human at 200% zoom and in forced-colours or high-contrast modes.
- Behaviour in Safari and Firefox.
