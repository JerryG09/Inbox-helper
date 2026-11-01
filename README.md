# Candidate Inbox Helper — MUST Option A

> **Submission status (1 Nov 2026):** the repository is submission-ready. The two recordings (Loom workflow walkthrough and five-minute demo) are `PENDING_OWNER_RECORDING`. See [`docs/submission/FINAL-SUBMISSION.md`](docs/submission/FINAL-SUBMISSION.md). Specification: [`Final directive.md`](Final%20directive.md). Intent: [`intent.md`](intent.md).

A recruiter tool that classifies short candidate messages into six intents, flags items that need attention and drafts short suggested replies **for human review**. It never sends messages, makes hiring decisions or stores data. It has no authentication and is **not deployed**; run it locally only.

Implementation of the owner-approved **Hi-fi V1.1** design. Synthetic candidate data only. Two processing modes:

- **Simulated** (default): deterministic, no network, no model calls. Used by the visual-parity and regression tests.
- **Anthropic** (AI-01, local development only): a server route classifies each message and drafts a suggested reply with the Anthropic Messages API (`claude-haiku-5-5`). A human reviews every draft; nothing is ever sent to candidates.

There is no sending, email, ATS integration, authentication, database or permanent storage in either mode.

- Design source of truth: [`reference/`](reference/) — the unchanged approved bundle (`MUST-Inbox-Helper-HiFi-V1.1-APPROVED-REFERENCE-BUNDLE.zip`) and its extracted contents.
- Contract: [`docs/MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md`](docs/MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md)
- Daily log: [`docs/daily-log/`](docs/daily-log/)

## Commands

```bash
npm ci
npm run verify:reference   # SHA-256 check of the frozen V1.1 bundle
npm run lint
npm run typecheck
npm test                   # Vitest: domain, processing, provider boundary (fake provider), UI
npm run build
npx playwright install chromium
npm run test:visual        # Simulated parity + flows, and live-mode flows against a local fake Anthropic upstream
                           # (needs `npm run build` first; spends no tokens)
```

## Running in live Anthropic mode (local only)

```bash
# .env.local (git-ignored)
INBOX_PROCESSING_MODE=anthropic
ANTHROPIC_API_KEY=<your key>
ANTHROPIC_MODEL=claude-haiku-5-5
npm run build && npm start   # or npm run dev; open http://127.0.0.1:3000 or http://localhost:3000
```

The header badge shows **Live Anthropic AI** when the server is configured, and **Live AI unavailable** when the mode is `anthropic` but no key is configured. Configuration is read on the server per request; the browser receives only the mode and model name.

Optional genuine-provider acceptance run (paid, bounded to 4 messages): `npx playwright test -c playwright.live-acceptance.config.ts`.

### Live mode restrictions

- **Do not deploy publicly.** `/api/process` has no authentication or abuse protection. It accepts only loopback hosts and same-origin requests, but that is not a security boundary for an internet-facing paid endpoint. A separate security gate is required first.
- Use synthetic candidate data only. Valid messages are sent to Anthropic only when you press **Start AI processing**.
- At most 10 messages per live request (rejected before any model call if exceeded); 2,000 characters per message; 64 KB request body.
- Per message: `max_tokens` 1,600, thinking off, structured JSON output, a 20 s timeout, at most 2 calls at once, no automatic retry. A failed message can be retried manually.
- Every model output is validated server-side, and drafts are checked for unsupported hiring claims whatever the model reports. Generated drafts are suggestions for recruiter review, not official messages. "Reject draft" rejects the draft, never the candidate.

`src/styles/hifi-v1.1.css` is the approved prototype's `<style>` block, byte-for-byte; a unit test enforces this.

## Genuine model evaluation (EVAL-04C, 30 Oct 2026)

One authorized first pass of `claude-haiku-5-5` through the unchanged product route, on 30 owner-adjudicated synthetic messages that were frozen before the run. The 30 calls cost about $0.00777. Evidence: [`docs/evidence/day4-eval04c/`](docs/evidence/day4-eval04c/).

| Metric | Haiku 5.5 | Deterministic baseline |
|---|---|---|
| Completed | 30/30 genuine calls | 30 deterministic predictions |
| Primary intent, strict | **25/30 (83.3%)** | 13/30 (43.3%) |
| Primary intent, lenient (owner alternatives) | 29/30 (96.7%) | 16/30 |
| Secondary intents P / R / F1 | 7/17 / 7/9 / ≈0.539 | 1/6 / 1/9 |
| Attention recall / precision | 11/12 / 11/22 | 0/12 |

These figures describe a single run on synthetic, Claude-authored data. They are not a claim about production performance.

## Known safety limitations

- **R-HANDOFF (P1):** 11 of 30 genuine drafts say the question "has been passed" to the recruitment team, which has not happened. The fix (SAFE-04) is **not implemented**.
- **R-CONTRA (P1):** H025 treats a retracted withdrawal as an active one.
- The hiring-claim detector is pattern-based. It has known misses (KL-1/2/3, R-INJ, R-WD, R-PII), pinned as 9 expected-failure tests. See [`docs/evidence/day3-ai02/safety-findings.md`](docs/evidence/day3-ai02/safety-findings.md).
- Human safety review of the 30 generated drafts is **incomplete**. Treat every draft as unsafe until a human has reviewed it.

## Accessibility limitations

- `main` includes the Day 3 accessibility corrections (UX-A11Y-01/02/03, owner-accepted).
- The Phase A focus-ring fix (A11Y-04, `5a951f5`) and the UI-06C contrast fixes (A11Y-05/06/07, `4e3be63`) are on separate branches and are **not in `main`**. UI-06C's visual exceptions are still awaiting owner acceptance.
- Only Chromium and emulated forced-colors were tested. Screen reader, Safari/Firefox, real zoom and OS high contrast are not verified.
- **No WCAG 2.2 AA conformance is claimed.** The legacy full browser parity suite is not green on the UI-06C branch.

## Evidence

- Evidence index: [`docs/submission/evidence-index.md`](docs/submission/evidence-index.md)
- Daily logs: [`docs/daily-log/`](docs/daily-log/)
- Unlearning note: [`docs/submission/one-page-unlearning-note.md`](docs/submission/one-page-unlearning-note.md)
