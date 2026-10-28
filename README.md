# Candidate Inbox Helper — MUST Option A

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
