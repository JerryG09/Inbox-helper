# UI-05A — Processing integrity and failed-only retry: evidence

Base: `main` = `d0eb48b2262196bdcfc307877ebd495ffdfa4f48`. Branch: `day2/ui-05a-processing-retry`. All processing is **simulated**: no model, network or provider is called.

## Visual parity (`parity-report.json`)
- **192 of 192 gated cases at 0 differing pixels** against the unchanged approved HTML in the same Chromium, with no horizontal overflow. That is the 176 earlier cases plus 16 new retry cases (4 states × 1440/390/320/768).
- New states are reached by the same clicks in the app and in the prototype (`retryOne()` / `retryFailed()`):
  - `retry-one-recovered`: Failed queue → Fatima Yusuf → "Retry this message (simulation) →".
  - `retry-failed-toolbar`: "Retry failed" from the toolbar.
  - `retry-after-human-reviews`: Ada edited and approved, David rejected, then "Retry failed".
  - `retry-recovered-show-all`: after retry, the All filter with the recovered record selected.
- Async capture waits for a defined terminal state: every record is Completed or Failed according to the metric cards. It does not use sleeps.
- UX-04-01 cases keep their recorded exception handling. No new parity exception was needed or taken.
- Screenshots in this folder: `*.app.png` (app) and `retry-one-recovered-{1440,390}.canonical-live.png` (approved HTML, same steps).

## Historical evidence
- `docs/evidence/ui-04-r1/` and all earlier folders are byte-for-byte unchanged. I verified this with sha256 over 47 files before and after the full visual run.
- The parity harness now writes to this folder instead of `ui-04-r1`.

## What the browser does not show
- Injected faults (missing, duplicate, exception or delayed outcomes, and multiple failures) have no approved visual. They are covered by `test/visual/retry-flow.spec.ts` and the unit tests, not by parity screenshots.
- **The in-flight state is not designed.** While a retry is pending, the record is Processing, and the detail reuses the existing "Queued for processing. No review actions are available." notice. Its wording says "Queued" rather than "Processing". I did not change it because that would be an unapproved visual or copy change. With the default simulation it resolves within the same task and is not normally visible. It is visible only with an injected delay. **Owner decision requested** if a distinct in-flight message is wanted.
