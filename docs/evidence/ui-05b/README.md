# UI-05B — Batch Results and CSV export: evidence

Base: `main` = `26bc19878814862c0bea4f9758c8d05a61c776d1`. Branch: `day2/ui-05b-results-export`. All processing remains **simulated**.

## Visual parity (`parity-report.json`)
- **212 of 212 gated cases at 0 differing pixels** against the unchanged approved HTML in the same Chromium, with no horizontal overflow. That is the 192 earlier cases plus 20 new Results cases (5 states × 1440/390/320/768).
- New states, reached by the same clicks in the app and in `renderResults()`:
  - `results-initial`
  - `results-queued-before-reveal`
  - `results-partially-reviewed` (Ada approved, David rejected)
  - `results-after-retry` (Ada approved, then "Retry failed")
  - `results-corrected-drafts` (M003 corrected, rechecked and approved; David's primary corrected; Ada approved, then edited back to Pending)
- No new parity exception. UX-04-01 and UX-05A-01 are unchanged.
- Harness fix: the terminal-state probe now reads only the visible section's metric cards, because the Results view now renders its own metrics.
- **Not pixel-compared:** `results-injected-partial-failures-{1440,390}.app.png`. Injected M001/M002 failures cannot happen in the prototype.

## CSV export
- **Schema:** 14 columns in the approved order. The header is unquoted, every value is quoted, records are separated by CRLF, batch order is kept and only validated records are exported. File `candidate-inbox-demo-results-v1-1.csv`, type `text/csv;charset=utf-8`.
- **Formula guard:** a faithful port of the prototype's `csvQuote()`. If the RAW value matches `/^[\u0000- ﻿]*[=+\-@]/`, the CSV cell gets a leading `'`; embedded `"` are then doubled. The guard runs before quoting, so escaped quotes cannot hide or create a trigger.
- **Tests:**
  - 18 attack strings: `=HYPERLINK(…)`, `+SUM(1,2)`, `-1+2`, `@SUM(A1:A2)`; space, tab, CR, LF and CRLF prefixes; NUL and other C0 control characters; BOM; BOM combined with whitespace; leading quote characters; embedded newlines.
  - Checks in every exported column.
  - A mutation test showing that a guard without the whitespace/control prefix would leave executable cells.
- **Browser proof:** Journey F reads the file the browser actually downloaded and checks:
  - 4 records (header plus 3) and 14 columns per row;
  - no decoded cell is executable;
  - the protected values are exact;
  - the app still shows the raw values.

### Threat model and limitations (not universal protection)
- **Targets:** spreadsheet apps that evaluate cells beginning with `= + - @` when opening a CSV (Excel, LibreOffice Calc, Google Sheets import), including after leading ASCII whitespace or control characters or a BOM. This follows the OWASP CSV-injection guidance.
- **Not covered:**
  - Values led by non-ASCII whitespace (for example U+00A0 or U+3000), or fullwidth `＝`. Mainstream apps do not treat these as formulas today, but behavior can differ by app and locale.
  - DDE in legacy Office configurations beyond the leading-character rule.
  - Any app that strips a leading apostrophe on import.
- **Visible side effect:** guarded cells keep the apostrophe as visible data. A value like `-1` exports as `'-1` (text). This is the approved prototype's behavior.
- **Input reach:** import trims name, subject and message and limits IDs to `[A-Za-z0-9_-]`, so most whitespace-prefixed payloads can only arrive through human draft edits. These are covered.
- No departure from the canonical `csvQuote()` was needed: no edge case inside this threat model was found that it fails.

## Accessibility
- The table has `aria-label="Batch results by message"` and `scope="col"` headers. Neither affects pixels.
- The download is a native button and works from the keyboard.
- A polite announcement says "CSV download started. No draft was approved, rejected or sent."
- No formal WCAG audit was done (that is UI-06).

## Historical evidence
`docs/evidence/ui-05a/` and all earlier folders are byte-for-byte unchanged. I checked all 63 tracked files by sha256 before and after the full visual run.
