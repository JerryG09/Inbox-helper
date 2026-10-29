# UI-06A — Proposed visual exceptions

Owner authorised the *implementation* on 29 Oct 2026. Visual acceptance remains owner-reviewed.

All three items below are **`IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE`**. Passing tests do not constitute acceptance.

Frozen `src/styles/hifi-v1.1.css` is byte-for-byte unchanged (`css-fidelity.test.ts` passes; SHA-256 `7c3d48ef…a799`). The reference bundle is unchanged (`npm run verify:reference`).

## UX-A11Y-01 — Enhanced keyboard focus on form fields, selects and the draft editor

| | |
|---|---|
| **Existing behaviour** | The frozen rule `.field input, .field textarea, .field select, select {outline:none}` comes after the global `:focus-visible` outline, at equal specificity. So focused fields, the primary-intent select and the draft editor showed only `box-shadow: 0 0 0 3px rgba(108,117,242,0.11)` and a border tint. Measured: `focus-measurements-before.jsonl`. Queue filters already showed the frozen `3px solid #8a91fb` (2.79:1 on white). |
| **Why** | WCAG 2.4.7 Focus Visible; 1.4.11 Non-text Contrast. The 0.11-alpha ring is effectively invisible. |
| **Implementation** | `src/styles/ui-06a-accessibility.css`, loaded after the frozen sheet: `.field input/textarea/select, .filtergrid select, .draftarea` `:focus-visible` → `outline: 3px solid #4f46e5; outline-offset: 2px`. The existing border and shadow are untouched. |
| **Before / after** | `screenshots/before-draft-editor-focus-{1440,390}.png` → `screenshots/after-draft-editor-focus-{1440,390}.png` |
| **Keyboard proof** | `a11y-ui06a.spec.ts` "form fields and draft editor…" at 1440, 1280, 390 and 320. Focus is reached with Shift+Tab/Tab. Unfocused `outline-style: none`; focused `solid 3px rgb(79,70,229) offset 2px`; not clipped by any overflow ancestor. |
| **Pixel differences** | **Only where the harness leaves one of these controls focused.** 24 parity states (6 × 4 widths) differ, listed below. With the focused element blurred in both pages, **all 24 are 0 px** (`parity-focus-classification.jsonl`). Primary-select states: the diff box is the select plus the ring (e.g. 326×53 at 1440). Draft-editor states: ~90% of differing pixels are inside the ring box. About 504 px (1440 `review-empty-draft`) appear further down in the decision-bar region **only while the editor is focused**; they look identical in side-by-side crops, and the cause is not determined. **Flagged for owner visual review.** The queue-filter ring colour also changes from #8a91fb to #4f46e5; no parity state captures a focused filter. |
| **Regression risk** | Low. Text inputs always match `:focus-visible`, so mouse users now also see the ring while typing. This is intended (a typing caret context) but is a visible change. |
| **Status** | `IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE` |

**Affected parity states**, focus-only (unfocused = 0 px), each at 1440, 390, 320 and 768:

| State | Control left focused |
|---|---|
| `review-approved-filter-then-edit` | draft editor |
| `review-empty-draft` | draft editor |
| `review-blocked-edited` | draft editor |
| `review-blocked-reintroduced` | draft editor |
| `review-primary-swap` | primary select (restored by the app after re-render) |
| `review-primary-correct` | primary select |

The other **188 of 212** parity cases pass at 0 px, unchanged. The harness, its thresholds and its cases were **not** modified.

## UX-A11Y-02 — Visible keyboard focus on "Choose local CSV"

| | |
|---|---|
| **Existing behaviour** | `#csvFile` is `sr-only` (1×1 px) and follows its visible `<label class="btn">`. Keyboard focus landed on the invisible input, and the label showed no change (`outline-style: none`). Pinned as A11Y-02 `test.fail` at `47ca9c7`. |
| **Why** | WCAG 2.4.7: the primary import control had no visible focus. |
| **Implementation** | CSS only: `.blank:has(> #csvFile:focus-visible) > label[for="csvFile"] { outline: 3px solid #4f46e5; outline-offset: 3px }`. No markup change, so `ImportWorkspace.tsx` is unchanged. The native input, its single tab stop and its accessible name are unchanged. |
| **Before / after** | `screenshots/before-csv-focus-{1440,390}.png` → `screenshots/after-csv-focus-{1440,390}.png` |
| **Keyboard proof** | At 1440, 1280, 390 and 320: `#csvFile` is focused, and the label's outline is solid 3px #4f46e5 on a 138×40 control, not clipped. Enter opens the native file chooser; the chosen file is validated ("Process 1 valid messages →"). The label has no `tabindex`. |
| **Pixel differences** | Visible only while the CSV input has keyboard focus. No parity state focuses it, so all parity import states are unchanged. |
| **Regression risk** | Depends on `:has()` (Chromium 105+, Safari 15.4+, Firefox 121+). Older browsers fall back to the previous invisible state. Only Chromium was tested. |
| **Status** | `IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE` |

## UX-A11Y-03 — Named secondary-intent group (no visual change intended)

| | |
|---|---|
| **Existing behaviour** | "Secondary intents" was a `<label>` with no control; the checkboxes had no group (`getByRole('group')` count 0). |
| **Why** | WCAG 1.3.1 Info and Relationships; 4.1.2 Name, Role, Value. |
| **Implementation** | `CandidateReview.tsx`: the label gets `id="secondaryIntentsLabel"`; `.secondary-options` gets `role="group" aria-labelledby="secondaryIntentsLabel"`. Element types, classes, labels and order are unchanged. |
| **Accessibility tree** | `group "Secondary intents"` → `checkbox "Application status"`, `checkbox "Interview scheduling" [checked]`, … (`ariaSnapshot` in `focus-measurements-after.jsonl`). |
| **Pixel differences** | None: every parity state showing the review panel without a focused field passes at 0 px. |
| **Status** | `IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE` (semantic only) |

## UI-06A R1 diagnostic update (29 Oct 2026)

*Appended. The UI-06A text above is kept as originally written.*

The ~504 px "unexplained" residue noted under UX-A11Y-01 was investigated in `docs/evidence/day3-ui06a-r1/`:
- **Precise count:** 238 px outside the permitted ring region for `review-empty-draft-1440`; 238–904 px across the 16 draft-editor cases; **0** for the 8 primary-select cases.
- **What they are:** deterministic antialiasing differences of 1–4/255 on button corners and glyph edges near the editor. Caret hidden: unchanged. Repeat captures: identical.
- **Control experiment:** the unchanged approved HTML with only `ui-06a-accessibility.css` injected matches the app at **0 px in all 24 cases**. So every difference, inside and outside the ring, is produced by painting the new focus outline. No other product presentation or behaviour differs.
- **Classification:** all 24 cases → **`EXPLAINED_ACCESSIBILITY_EXCEPTION`**. The exact Chromium rasterisation mechanism is not established.
- **Status of UX-A11Y-01/02/03:** still `IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE`.

## OWNER FINAL VISUAL ACCEPTANCE — 29 OCTOBER 2026

*Appended at Day 3 closeout. The observations and statuses above are preserved as the historical chronology.*

**Decision:** the owner explicitly approved **UX-A11Y-01**, **UX-A11Y-02** and **UX-A11Y-03**, covering their implementation and documented visual appearance. The approval was communicated through the owner-authorised Day 3 final closeout directive. No separate signed document was supplied.

**Basis:**
- Accepted diagnostic HEAD `66e535d2de1e21fae126d7e91c3e904037bf8b2b`; the architect's UI-06A R1 decision was `UI06A_R1_FOCUS_PARITY_ACCEPTED`.
- The original frozen stylesheet `src/styles/hifi-v1.1.css` is unchanged (SHA-256 `7c3d48ef…a799`), and so is the approved reference bundle.
- Normal, unfocused presentation remains pixel-identical to the approved HTML.
- The 24 originally differing parity states are intentional, focus-dependent accessibility exceptions.
- The control (reference + UI-06A stylesheet) matches the app at **0 px in all 24 cases**.
- The small outside-ring differences are deterministic antialiasing effects of the focus styling. The exact Chromium compositor mechanism remains **unverified**.
- **No other product changes were approved** by this acceptance.

| Exception | Current status |
|---|---|
| UX-A11Y-01 — enhanced keyboard focus on form fields, selects and the draft editor | **OWNER_VISUALLY_ACCEPTED** (29 Oct 2026) |
| UX-A11Y-02 — visible keyboard focus on the CSV upload control | **OWNER_VISUALLY_ACCEPTED** (29 Oct 2026) |
| UX-A11Y-03 — accessible secondary-intent grouping, unchanged visual layout | **OWNER_VISUALLY_ACCEPTED** (29 Oct 2026) |

**Still open, and not covered by this acceptance:**
- A11Y-04 (frozen button/link focus ring 2.79:1)
- "Review status" label semantics
- screen-reader, Safari and Firefox, zoom/reflow and forced-colours testing
- formal WCAG 2.2 AA assessment
