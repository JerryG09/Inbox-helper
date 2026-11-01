# UI-06 — Accessibility findings register (Day 4)

All findings were reproduced in Chromium, simulated mode. Severity scale: P1 blocks a core task; P2 is a significant barrier with a workaround; P3 is minor.

| ID | Title | WCAG | Severity | Status | Fix authorized? |
|---|---|---|---|---|---|
| A11Y-01/02/03 | Field and editor focus, CSV label focus, secondary-intent group name (Day 3) | 2.4.7, 1.4.11, 1.3.1 | — | CORRECTED; owner-accepted 29 Oct (E-D3-20); re-verified 30 Oct (`a11y-ui06a.spec.ts` 10/10) | — |
| **A11Y-04** | Button/summary focus ring 2.60–2.79:1 | 1.4.11 | P2 | **CORRECTED** in the override sheet. Visual exception `UX-A11Y-04_PENDING_OWNER_VISUAL_ACCEPTANCE` | Yes (Phase A) |
| **A11Y-05** | "Needs attention only" checkbox focus ring 2.79:1 | 1.4.11 | P2 | **OPEN**, reproduced, pinned | **No.** Needs owner authorization |
| **A11Y-06** | Body/small text below 4.5:1 in frozen V1.1 tokens | 1.4.3 | P2 | **OPEN**, measured | No |
| **A11Y-07** | Text input, select and draft-editor boundaries 1.30–1.35:1 | 1.4.11 | P2 | **OPEN**, measured | No |
| A11Y-08 | Text glyph icons (`◷ ! ✦ ▣ ◫ ✎`) not hidden from assistive technology | 1.1.1 / 1.3.1 | P3 | OPEN (unverified effect) | No |
| A11Y-R1 | Static `<label>Review status</label>` not associated with a control | 1.3.1 (semantic) | P3 | Documented only; no redesign, per directive | No |

---

## A11Y-05 — Checkbox focus indicator (reproduced; NOT corrected)

**Affected control:** one control is affected: `.checkline input[type=checkbox]` ("Needs attention only") in the inbox left-pane filters, `src/components/MessageQueue.tsx:32`.

**Not affected:** the 7 secondary-intent checkboxes already render `#4f46e5` (6.29:1), because they are inside `.field` and covered by UX-A11Y-01.

**Measurement** (`a11y05-checkboxes-after.jsonl`):
- outline `3px solid rgb(138,145,251)` with offset 3 px
- adjacent background `#ffffff` (`.leftpane`)
- **2.79:1**
- not clipped by an overflow ancestor
- reached by Tab at 1440×900 in `inbox-review` and `inbox-blocked`

At 390 px the left pane is hidden while the review detail is open. Reaching it on mobile via "← All messages" was not re-measured.

**Reproduction:**
1. Load the sample, process and reveal.
2. Press Tab until "Needs attention only" is focused.
3. Observe the pale ring.

**Evidence:** screenshot `screenshots/after-a11y05-needs-attention-only-1440.png` (still unfixed after A11Y-04, so it is a "before" image for A11Y-05). The spec test "A11Y-05 reproduction" pins the defect: it fails when the defect disappears, so the fix will be noticed.

**Proposed minimal correction** (not applied), in `src/styles/ui-06a-accessibility.css`:

```css
.checkline input[type="checkbox"]:focus-visible { outline-color: #4f46e5; }
```

This is expected to give 6.29:1 on `#fff`, with no change to unfocused, checked or disabled appearance.

**Acceptance gates:**
1. "A11Y-05 reproduction" flips: update it to assert ≥ 3:1 for every checkbox.
2. `a11y-day4-ui06.spec.ts` and `a11y-ui06a.spec.ts` stay green.
3. A focused-checkbox parity case (app vs reference + override = 0 px; unfocused = 0 px).
4. Owner visual acceptance as `UX-A11Y-05`.

## A11Y-06 — Text contrast (1.4.3), frozen V1.1 design tokens

**Measured** (`text-contrast-after.jsonl`, 884 text rows; translucent backgrounds composited over their actual ancestors). Below 4.5:1 for normal-size text:

| Element | Colour on background | Ratio |
|---|---|---|
| step/count `span` "1", "2" | `#98a4ba` on `#f3f5fa` | 2.30 |
| `footer` | `#8d9bb1` on `#f5f7fb` | 2.63 |
| `.work-toolbar-sub` | `#8996a9` on `#f5f7fb` | 2.80 |
| `.readback` (preserved original AI output, historical finding text) | `#8190a7` on `#fafbfe` | 3.13 |
| `.edit-label` "Human-editable" | `#737ee1` on `#f0f2ff` | 3.25 |
| table `th` | `#75819c` on `#f5f7fb` | 3.64 |
| `.avatar` initials | | 3.75 |
| `.eyebrow` | | 4.25 |
| `.side-fine` on navy | | 4.29 |
| **`.btn.danger` "Reject draft"** | `#bc5960` on `#fffafa` | **4.29** |
| `.queue-count` | | 4.45 |

**Also needs a decision:** decorative glyph icons at 2.65–4.31. They are text, so they are subject to 1.4.3 unless they are hidden as decorative (see A11Y-08).

**Excluded:**
- disabled buttons (`opacity .43`; 1.4.3 exempts inactive components);
- text on gradients, which is flagged for manual checking (the intro strip measures 4.30–8.01 against its base colour).

**Proposed direction** (not applied; needs owner authorization): darker override tokens in `ui-06a-accessibility.css` for the listed selectors, measured to ≥ 4.5:1, plus owner visual acceptance. This changes unfocused appearance, so it is a design decision, not a focus-only fix.

## A11Y-07 — Form-field boundaries (1.4.11)

- `.field input/select/textarea` and `select`: border `#dbe2ee` on a `#fff` field inside a `#fff` panel, **1.30:1**.
- `.draftarea`: border `#d7def0`, **1.35:1**.

The field's extent is visible only through that border, so the boundary needed to identify the component is below 3:1. Proposed direction (not applied): border override at ≥ 3:1, for example `#8792a8`, with owner visual acceptance.

## A11Y-08 — Text glyph icons exposed (1.1.1 / 1.3.1, P3)

**Where:** `metric-icon`, `heading-icon` and `intro-spark` glyphs are rendered as text without `aria-hidden`.

**Risk:** a screen reader may read "exclamation mark", "black square" and similar.

**Status:** not verified with a screen reader (manual guide §3). Proposed: `aria-hidden="true"` on purely decorative glyph spans. This is a component change, so it needs a separate instruction.

## A11Y-R1 — "Review status" label semantics (P3, documented only)

`<label>Review status</label>` (`CandidateReview.tsx:80`) captions a read-only `div#humanReviewStatus` and is not associated with a control. The value is also announced through `#globalLive` when it changes.

**Not redesigned**, per directive. If a change is wanted later, a smaller option is a non-`label` caption element.
