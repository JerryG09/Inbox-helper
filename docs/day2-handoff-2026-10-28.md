# Day 2 handoff — Wednesday 28 October 2026

**Carry-forward engineering baseline:** `628f85d9045bbb10e159afb1b842d7660e9c3ff6` (`day1/ui-04-human-review`). The Day 1 documentation-only branch, if created, must not be mistaken for an additional engineering acceptance. `main` was still `1005fe2` at Day 1 acceptance.

## Day 2 primary sequence (requires separately bounded authorization)

1. **UI-05:** failed-only retry without touching already edited/approved items; populated Batch Results and results counts; CSV export with spreadsheet formula-injection neutralization, quotes/delimiters/newlines tests, no loss of failed records.
2. **Real AI adapter:** server-only Anthropic use with `.env.local`, explicit provenance, schema-validation, per-record timeout/failure states, provider parameters and cost/latency measurements, no candidate sending. Do not represent deterministic fixtures as provider calls.
3. **Early a11y:** keyboard/focus and live status for progress, retry, validation and result export; all later tests target WCAG 2.2 AA, with formal UI-06 gate on Day 4.

## Immediate technical issues to control

- `applyOutcomes` currently lacks complete protection for missing, duplicate, unexpected, and late results; never allow a batch to appear complete while a record remains inadvertently `processing` or disappears.
- Human edits, original AI output and historical safety findings must survive partial retry.
- Draft approval is an internal decision only; no candidate/hiring selection, email or ATS operations.
- Respect the frozen Hi-fi V1.1 plus approved exception `UX-04-01`. No other unapproved design changes.
- Document intended max output tokens, truncation and reasoning-token budget. The historical 30-message run had two `max_tokens:400` truncations; its targeted 800-token follow-ups succeeded but do not prove deterministic model behavior.

## Deferred evaluation and submission work

- Owner confirmation of labels is pending; the already-inspected 30 examples remain exploratory. Define genuinely held-out, human-labeled evaluation data before running it on Day 4.
- Build WCAG 2.2 AA automated+manual audit evidence (axe Playwright, keyboard, visible focus, labels, status announcements, 200% text and 400% zoom/reflow, contrast, reduced motion, screen-reader checks). A core-workflow failure is a release blocker.
- Produce dated Days 2–5 logs, final directive, complete README, Loom and five-minute product recording, one-page unlearning note. Use actual finished workflows in videos rather than pretending simulations are provider integrations.

**Day 1 stopping rule honored:** no UI-05 or other Day 2 implementation in the October 27 closeout.
