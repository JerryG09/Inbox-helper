# Candidate Inbox Helper — MUST Option A

Implementation of the owner-approved **Hi-fi V1.1** design. Synthetic candidate data and simulated AI only: no real model calls, sending, authentication, database or backend.

- Design source of truth: [`reference/`](reference/) — the unchanged approved bundle (`MUST-Inbox-Helper-HiFi-V1.1-APPROVED-REFERENCE-BUNDLE.zip`) and its extracted contents.
- Contract: [`docs/MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md`](docs/MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md)
- Daily log: [`docs/daily-log/`](docs/daily-log/)

## Commands

```bash
npm ci
npm run verify:reference   # SHA-256 check of the frozen V1.1 bundle
npm run lint
npm run typecheck
npm test                   # Vitest: CSS fidelity + shell navigation
npm run build
npx playwright install chromium
npm run test:visual        # Screenshot parity at 1440/390/320/768 (needs `npm run build` first)
```

`src/styles/hifi-v1.1.css` is the approved prototype's `<style>` block, byte-for-byte; a unit test enforces this.
