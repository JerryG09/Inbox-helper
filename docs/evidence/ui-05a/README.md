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
- **In-flight state:** see UX-05A-01 below. Before R1, the detail showed "Queued for processing" while a record was Processing.

## UX-05A-01 — owner-authorized copy/accessibility exception (UI-05A R1, 28 Oct 2026)
This exception is separate from the historical UX-04-01 parity exceptions, which are unchanged.

| Status | Approved V1.1 | App |
|---|---|---|
| `queued` | "Queued for processing. No review actions are available." | Unchanged |
| `processing` | No equivalent: the prototype's retry is synchronous, so it never shows this state. | "Processing this message. No review actions are available until processing finishes." |

- **Wording:** provider-neutral. It mentions neither a simulation nor any provider, so AI-01 can reuse it.
- **Accessibility:** the existing notice has `role="status"`, an implicit polite live region, for both states. There is no `aria-live="assertive"` and no alert. The existing completion and failure announcements in `#globalLive`, and the focus moves, are unchanged.
- **Styling:** the existing `notice mt` element is reused. No CSS or new element was added. The `queued` text is identical, so the gated `inbox-queued-before-reveal` cases remain at 0 px.
- **Evidence:** `ux-05a-01-processing-{1440,390}.app.png`, captured under an injected 5 s delay once the Processing notice was present. There is no approved HTML to compare it against, so it is not pixel-gated.
- **Known limitation, not changed in R1:** under the Failed filter, a record that starts processing leaves the filtered list. So the notice is visible only when the record stays in view, for example under the All filters. With the default simulation the retry settles at once.

## AI-01 handoff item (carried forward)
`window.__MUST_SIM_PLAN__` (`simulationAdapters()` in `src/lib/processing/mock.ts`) ships in the production bundle. It is client-only and simulation-only. **It must be removed or safely gated before genuine provider processing is enabled.**
