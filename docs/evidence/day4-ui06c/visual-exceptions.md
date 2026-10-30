# UI-06C — Proposed visual exceptions (pending owner visual acceptance)

**None of these is owner-approved.** UX-A11Y-04 was accepted on 30 Oct (recorded in `docs/evidence/day4-ui06/visual-exception-ux-a11y-04.md`), and that acceptance does not cover these.

**Screenshots:** `screenshots/before-<name>-<width>.png` vs `screenshots/after-<name>-<width>.png`.
- **"Before"** is the approved HTML plus the override sheet *as accepted at `5a951f5`*, in the same state (= the owner-accepted appearance).
- **"After"** is the app.

## UX-A11Y-05_PENDING_OWNER_VISUAL_ACCEPTANCE (focused state only)

- **Why needed:** the "Needs attention only" checkbox's keyboard focus ring was 2.79:1 (WCAG 1.4.11).
- **Change:** the ring is `#4f46e5` instead of `#8a91fb`. It is the same ring as UX-A11Y-01/04, with width, offset, unfocused and checked appearance unchanged.
- **Evidence:** `screenshots/after-a11y05-focus-{1440,390,320}.png`. The "before" is the Phase A capture `docs/evidence/day4-ui06/screenshots/after-a11y05-needs-attention-only-1440.png`.
- **Parity:** the legacy suite never focuses this checkbox, so this exception adds no legacy parity difference.

## UX-A11Y-06_PENDING_OWNER_VISUAL_ACCEPTANCE (unfocused appearance)

- **Why needed:** eleven text styles measured 2.30–4.45:1, below 4.5:1 (WCAG 1.4.3).
- **Change:** each is slightly darker within its own hue (`.side-fine` slightly lighter on navy). The exact before/after values are in `contrast-inventory.md`.
- **Unchanged:** hierarchy, sizes, weights and spacing.

| Element | Desktop pair | Mobile pair |
|---|---|---|
| Breadcrumb `.eyebrow` | `before/after-eyebrow-1440.png` | `…-390.png` |
| Footer | `before/after-footer-1440.png` | `…-390.png` |
| Table headers | `before/after-table-header-1440.png` | `…-390.png` |
| Group count | `before/after-group-count-1440.png` | `…-390.png` |
| Toolbar sub-line | `before/after-work-toolbar-sub-1440.png` | `…-390.png` |
| Queue count | `before/after-queue-count-1440.png` | `…-390.png` |
| Avatar initials | `before/after-avatar-1440.png` | `…-390.png` |
| "Human-editable" | `before/after-edit-label-1440.png` | `…-390.png` |
| "Reject draft" | `before/after-reject-draft-1440.png` | `…-390.png` |
| Preserved output (`.readback`) | `before/after-readback-1440.png` | `…-390.png` |
| Sidebar fine print | `before/after-side-fine-1440.png` | not displayed at 390 |

## UX-A11Y-07_PENDING_OWNER_VISUAL_ACCEPTANCE (unfocused appearance)

- **Why needed:** text-field and draft-editor boundaries were 1.30:1, and the boundary is the cue that identifies an empty white field on a white panel (WCAG 1.4.11).
- **Change:** border colour `#dbe2ee` → `#8792a8` on the manual-entry inputs, the manual-message textarea and the draft editor. Selects are deliberately unchanged; see `contrast-inventory.md`.
- **Screenshots:** `before/after-field-input-*`, `before/after-field-textarea-*`, `before/after-draft-editor-*` (1440, 390).
- **Owner design question:** selects keep the lighter border, so after this change text fields look slightly stronger than selects. If you prefer visual consistency, selects can be included in a follow-up; it is not required for 1.4.11.

## Parity classification (all 212 legacy cases)

See `README.md` § Parity and `parity-classification.jsonl`. Every legacy difference is attributed to these three exceptions, or to the already accepted UX-A11Y-01/02/03 focus differences, or to a ≤ 1/255 anti-aliasing residue on the re-coloured rounded field borders. That residue is a deviation from exact 0 px and needs architect acceptance.

## Owner decisions required

```text
UX-A11Y-05:  _____  (OWNER_VISUALLY_ACCEPTED | CHANGES_REQUESTED → <notes>)
UX-A11Y-06:  _____
UX-A11Y-07:  _____   (and: include selects?  YES / NO)
Date:        _____
```
