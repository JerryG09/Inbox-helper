# UX-A11Y-04 — Proposed visual exception

**Status:** `UX-A11Y-04_PENDING_OWNER_VISUAL_ACCEPTANCE`. This exception is **not owner-approved**.

## What changes visually

When a **button** or **disclosure summary** has *keyboard* focus (`:focus-visible`), outside the navy sidebar, its focus ring colour changes:

- **from** `#8a91fb` (approved V1.1)
- **to** `#4f46e5`, the colour already owner-accepted for fields in UX-A11Y-01

## What does not change

- The ring's width (3 px), offset (3 px) and style.
- Every unfocused, hover, pressed, active and disabled appearance.
- Mouse-click focus (`:focus-visible` does not match pointer focus on buttons in Chromium).
- The sidebar navigation ring (stays `#8a91fb`).
- The frozen stylesheet and the prototype.

## Why

Measured contrast for the approved ring is 2.79:1 on `#fff` and 2.60:1 on `#f5f7fb`, below the 3:1 reference (WCAG 1.4.11). The corrected ring measures 6.29:1 and 5.86:1.

Measurements: `a11y-04-measurements.md`.

## Evidence for review

| Pair (before vs after) | Files |
|---|---|
| Desktop, white panel | `screenshots/before-focus-load-sample-1440.png` vs `screenshots/after-focus-load-sample-1440.png` |
| Desktop, page background | `screenshots/before-focus-reset-1440.png` vs `after-focus-reset-1440.png` |
| Desktop, decision bar | `before-focus-approve-1440.png` vs `after-focus-approve-1440.png` |
| Desktop, disclosure | `before-focus-summary-original-1440.png` vs `after-focus-summary-original-1440.png` |
| Mobile | the same names with `-390` |
| Sidebar (expected unchanged) | `before-focus-nav-inbox-1440.png` vs `after-focus-nav-inbox-1440.png` |
| App vs approved prototype, focused | `screenshots/a11y04-parity-<case>-<width>-app.png` vs `…-reference.png` |

## Parity classification

- **12 dedicated focused cases:** all differences lie inside the focus ring.
- **Control:** reference + override stylesheet gives 0 px, so the override alone explains every difference.
- **Unfocused:** 0 px.
- **Existing 212-case parity suite:** unchanged by this exception (still 188 pass, plus the same 24 owner-accepted UX-A11Y-01/02/03 differences).

## Owner decision required

```text
UX-A11Y-04:  _____  (OWNER_VISUALLY_ACCEPTED | CHANGES_REQUESTED → <notes>)
Date:        _____
```

A11Y-05 (checkbox) is **not** part of this exception. It is unfixed and will be proposed separately.

---

## OWNER DECISION — 30 October 2026 (WAT), appended by UI-06C

```text
UX-A11Y-04:  OWNER_VISUALLY_ACCEPTED
Date:        30 October 2026 (WAT)
Scope:       exactly the Phase A implementation and evidence at 5a951f50635d3a08c2d453c555822cc782093d5f:
             button/link/summary :focus-visible rings #4f46e5; navy sidebar keeps #8a91fb; outline geometry
             unchanged; unfocused presentation unchanged; the twelve dedicated A11Y-04 parity cases as documented.
Source:      owner/architect directive "DAY 4 UI-06C" (no signed document).
```

The pending decision block above is kept as written, for history. This acceptance does **not** extend to UX-A11Y-05, -06 or -07; those are proposed separately in `docs/evidence/day4-ui06c/visual-exceptions.md`.
