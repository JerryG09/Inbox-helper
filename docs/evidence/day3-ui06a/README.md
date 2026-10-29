# UI-06A — Accessibility remediation (A11Y-01/02/03): review packet

**Branch:** `day3/ui-06a-accessibility`, from accepted REQ-03 HEAD `02e81cf11d55560834dbbcedb9e7dc1ee7f975b3`. `origin/main` = `6a23fe2`, verified. The ending SHA is in the final report and the Day 3 log.

**Authorisation:** the owner authorised the UI-06A implementation on 29 Oct 2026. **Visual acceptance remains pending.**

**Who did what:** Claude Code (`claude-opus-5-5`) implemented, tested and documented the work. All results are Claude-run. Independent architect review and owner visual review are pending.

## Changes

| File | Change |
|---|---|
| `src/styles/ui-06a-accessibility.css` (new) | Focus-state overrides only (UX-A11Y-01, UX-A11Y-02) |
| `src/app/layout.tsx` | Imports the override after the frozen sheet |
| `src/components/CandidateReview.tsx` | `id` on the "Secondary intents" label; `role="group" aria-labelledby` on `.secondary-options` |
| `test/visual/a11y-ui06a.spec.ts` (new) | 10 tests: CSV and field focus × 4 widths, group semantics, native chooser |
| `test/visual/ui06a-parity-focus.spec.ts` (new) | 24 tests: classify the focus-only parity differences; gate unfocused = 0 px |
| `test/visual/a11y-preliminary.spec.ts` | A11Y-02 `test.fail` → `test`; A11Y-03 group count 0 → 1 |

**Unchanged:**
- `hifi-v1.1.css` (SHA-256 `7c3d48ef…a799`) and the reference bundle
- `ImportWorkspace.tsx` (CSS alone was sufficient)
- the parity harness, thresholds and cases
- the prompt, taxonomy and safety rules

## Documents
- `accessibility-findings.md`: before → after for A11Y-01/02/03, "Review status", new A11Y-04, and workflow regression.
- `focus-measurements.md`: computed styles, geometry and contrast, with WCAG references.
- `visual-exceptions.md`: UX-A11Y-01/02/03, all `IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE`, plus the parity classification.
- Raw data:
  - `focus-measurements-{before,after}.jsonl`
  - `parity-focus-classification.jsonl`
  - `parity-report-ui06a-run.json`: the parity report produced by this branch's full run. The historical `docs/evidence/ui-05b/parity-report.json` was restored from git and is unchanged.
- Screenshots: `screenshots/{before,after}-{csv,draft-editor}-focus-{1440,390}.png`.

## Mutation checks
Each mutation was rebuilt and its focused tests run. Restoration was checked by SHA-256.

| Mutation | Result | Restored |
|---|---|---|
| CSV `:has()` rule removed from the override stylesheet | **5 failed**: A11Y-02 and CSV focus @1440/1280/390/320; the native-chooser test still passed | SHA-256 `762a1271…0f99` restored |
| `aria-labelledby` removed from the group | **2 failed**: the group test and the preliminary accessible-names test | SHA-256 `177ba9d1…a4eb4` restored |

## Verification
See `docs/daily-log/2026-10-29-day3.md` § UI-06A for exact results.

**Screen reader: NOT VERIFIED — HANDOFF TO FORMAL UI-06.**
