# UI-06C — Contrast inventory (A11Y-05 / A11Y-06 / A11Y-07)

**Rule:** every colour change is in `src/styles/ui-06a-accessibility.css`. The frozen `hifi-v1.1.css` and `reference/` are unchanged (`npm run verify:reference` passes).

**Method:**
- Each new colour is the same hue and saturation as the frozen one, with lightness lowered (or raised, on navy) in 0.25 % steps until it first measures ≥ 4.6:1. The extra 0.1 above 4.5 is a rounding margin.
- Ratios use WCAG relative luminance, against the background composited from the actual ancestor layers.
- Font size, weight and spacing are never changed.

## A11Y-06 — 1.4.3 Contrast (Minimum): corrected text

All entries are normal-size text (9–12 px, so none qualifies as large), and the required ratio is 4.5:1.

| Selector (exact) | Meaning | Frozen colour | Background | Before | New colour | After |
|---|---|---|---|---|---|---|
| `.grouphead span:nth-child(2)` | group count ("1", "2") | `#98a4ba` | `#f3f5fa` | 2.30 | `#5f6f8d` | 4.64 |
| `.footer` | product/mode disclosure footer | `#8d9bb1` | `#f5f7fb` | 2.63 | `#60718c` | 4.62 |
| `.work-toolbar-sub` | "0 approved · 0 rejected …" | `#8996a9` | `#f5f7fb` | 2.80 | `#627187` | 4.63 |
| `.readback` | preserved original AI output / historical finding | `#8190a7` | `#fafbfe` | 3.13 | `#63738d` | 4.65 |
| `.edit-label` | "Human-editable" | `#737ee1` | `#f0f2ff` | 3.25 | `#5361da` | 4.61 |
| `.preview th` | preview/results table headers | `#75819c` | `#f5f7fb` | 3.64 | `#64708c` | 4.62 |
| `.message:nth-of-type(3n) .avatar` | candidate initials (every 3rd row's palette) | `#378978` | `#e8f5f4` | 3.75 | `#30796a` | 4.62 |
| `.eyebrow` | view breadcrumb ("01 / Intake") | `#6573ad` | `#f5f7fb` | 4.25 | `#5e6da9` | 4.62 |
| `.side-fine` | sidebar mode fine print (navy) | `#6e829f` | `#111d33` | 4.29 | `#7588a4` (lightened) | 4.66 |
| `.btn.danger` | "Reject draft" | `#bc5960` | `#fffafa` | 4.29 | `#b95259` | 4.60 |
| `.queue-count` | "1 / 6" | `#65728b` | `#f3f5fb` | 4.45 | `#626f87` | 4.65 |

**Rendered verification** (`text-contrast.jsonl`, `a11y-ui06c.spec.ts` "A11Y-06"):
- **Coverage:** 1,748 text and placeholder rows across 8 states (import empty, import with errors, inbox list, review, blocked, blocked with the historical finding open, failed/retry, results) × 3 viewports (1440, 390, 320).
- **Opacity:** accounted for; measured after CSS transitions settle.
- **Result: 0 non-exempt failures.** The lowest are `.btn.danger` 4.60, input and textarea text 4.61, and `.edit-label` 4.61.
- **Placeholders:** user-agent `#757575` on `#fff`, **4.61** (24 rows); no change needed.

## Exemptions applied (W3C 1.4.3 exceptions; recorded, not hidden)

| Rows | Exemption | Detail |
|---|---|---|
| 99 | **Pure decoration** (`.metric-icon`, `.heading-icon`, `.intro-spark` glyphs `◷ ! ✦ ▣ ◫ ✎`, 2.65–4.31) | Each glyph sits beside a text label that carries the meaning (e.g. "! " + "Attention", "◷" + "pending"). Not recoloured, per directive. Their exposure to assistive technology remains **A11Y-08 (open)** |
| 48 | Text over a gradient (intro strip) | Measures 5.52–8.01:1 against the base colour; a manual visual check is recommended |
| 6 | **Inactive user-interface component** | disabled buttons (`opacity .43`) |

**Investigated, not a defect:** the opacity-aware scan first flagged the sidebar step numbers "01"/"02" at 3.5–4.4:1. That came from measuring mid-transition: the frozen nav animates `background-color` over 0.14 s. At rest they measure 8.71:1 (inactive) and 5.48:1 (active, on `#303c6a`). The scan now waits for `document.getAnimations()` to be empty.

## A11Y-05 — 1.4.11: checkbox focus indicator

| Control | Background | Before (5a951f5) | After |
|---|---|---|---|
| `.checkline input[type=checkbox]` "Needs attention only" | `#ffffff` | `#8a91fb` **2.79:1** | `#4f46e5` **6.29:1** at 1440, 390 and 320 |

- **Geometry:** 3 px width / 3 px offset, unchanged.
- **Unfocused:** outline `none`.
- **Checked state:** `accent-color` `rgb(89,101,239)` is unchanged; it toggles with Space and keeps its ring.
- **Size:** 15×15 px.
- **Secondary-intent checkboxes:** already 6.29:1, unchanged.

## A11Y-07 — 1.4.11: field boundaries (necessity analysis first)

| Control | Is the boundary needed to identify it? | Frozen border | Adjacent (inside / outside) | Before | Decision | After |
|---|---|---|---|---|---|---|
| `#manual-id`, `#manual-name`, `#manual-subject` (`.field input`) | **Yes.** A white field on a white panel; an empty field has only the border and a placeholder | `#dbe2ee` | `#fff` / `#fff` | 1.30 | `#8792a8` | **3.13 / 3.13** |
| `#manual-message` (`.field textarea`) | **Yes**, same reason | `#dbe2ee` | `#fff` / `#fff` | 1.30 | `#8792a8` | **3.13 / 3.13** |
| `#draftEditor` (`.draftarea`; the frozen `.field textarea` rule actually wins) | **Yes.** The editable region of the draft must be distinguishable from the read-only text around it | `#dbe2ee` (computed) | `#fff` / `#fff` | 1.30 | `#8792a8` | **3.13 / 3.13** |
| `#primaryIntent` (`.field select`) | **No.** It is identified by the native disclosure arrow (dark, high contrast) and its visible value text | `#dbe2ee` | `#fff` / `#fff` | 1.30 | unchanged | 1.30 (recorded) |
| `#processFilterSelect`, `#reviewFilterSelect` (`.filtergrid select`) | **No**, same reason; each also has a visible label | `#dfe5f0` | `#f9faff` / `#fff` | 1.21 / 1.26 | unchanged | recorded |

**Why `#8792a8`:** it was proposed in Phase A and measures 3.13:1 on `#fff`. It is a neutral grey-blue that stays close to the frozen field palette. The same-hue algorithmic result, `#7a94c0`, is a visibly more saturated blue, so it was rejected.

**Preserved** (verified per field, `field-boundaries.jsonl`):
- border width 1 px and radius;
- the frozen `:focus` border `#8992f0`;
- the UX-A11Y-01 focus outline `3px solid #4f46e5`.

**Specificity:** the selectors keep specificity equal to the frozen base rules (`.field input:where(...)` is (0,1,1)), so the frozen focus rules (0,2,1) still win.

**States not present in the product:** there are no field-level validation or disabled styles. Import errors are shown in the preview table, not on fields.

## Not changed (by design)

- Decorative glyphs (A11Y-08).
- Select borders.
- Every non-listed colour.
- All layout, typography and spacing.
- Copy.
- Components.
