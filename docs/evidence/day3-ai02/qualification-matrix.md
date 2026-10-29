# AI-02 — Requirements-to-evidence qualification matrix

**Source under test:** `6a23fe281e45769ae10bd00872b823ecb97dd2de`. Product source is unchanged on `day3/ai-02-reliability-evidence`.

**Status classes:**
- `EXISTING_VERIFIED` — covered by an existing test, which was rerun green in this slice.
- `NEW_TEST_REQUIRED` — a new test was added in this slice.
- `QUALIFICATION_GAP` — not covered and not closed here.
- `KNOWN_LIMITATION` — the gap is accepted and documented.
- `OUT_OF_SCOPE` — not part of this slice.

**Provenance of every row:** unit test or fake provider (deterministic fake, local HTTP fake, or `test/support/fake-anthropic.mjs`). No row is backed by a genuine model call. "Rerun" means Claude Code ran the test in this slice; independent rerun by the architect is pending.

New test files:
- `test/live/provider-http.test.ts` (H) — 8 tests. The real SDK client talks to an in-process HTTP fake.
- `test/live/adversarial-safety.test.ts` (A) — 33 tests: 19 regular and 14 `it.fails` residual-risk pins.
- `test/visual/a11y-preliminary.spec.ts` (P) — 5 Playwright tests (4 + 1 `test.fail` pin for A11Y-02), simulated project.

## AI-02A — Coverage audit summary

The audit found Day 2 coverage much broader than the directive assumed. Every failure-matrix code and every state-integrity invariant already had a targeted unit test, and most also had a browser test.

The **actual gaps** were:
1. Failure mapping was proven only with hand-built SDK error objects. The real SDK over HTTP had not been exercised for 429, 529, 401, network failure or timeout.
2. `maxRetries: 0` was asserted only through call counts on an injected fake. That fake bypasses the SDK, so the setting itself was untested.
3. The per-request concurrency cap had no test of its scope across independent requests.
4. Adversarial cases beyond hire/offer claims had no matrix: rejection, withdrawal, injection variants, delimiter forgery, third-party data.
5. No preliminary keyboard or focus check covered the import controls, accessible names, or focus visibility.

## AI-02B — Failure matrix

| # | Case | Implementation | Evidence | Status |
|---|---|---|---|---|
| 1 | HTTP 429 | `provider.ts` `classifyError` → `provider_rate_limited` | `provider.test.ts` "rate limit 429"; **H** "429 … one upstream request" | EXISTING_VERIFIED + NEW (wire) |
| 2 | HTTP 500 | → `provider_server_error` | `provider.test.ts`; **H** 500; browser: `live-flow.spec.ts` "delayed provider failures … recover through Retry" | EXISTING_VERIFIED + NEW |
| 3 | HTTP 529 | → `provider_overloaded` | `provider.test.ts`; **H** 529 | EXISTING_VERIFIED + NEW |
| 4 | HTTP 401 | → `provider_auth` | `provider.test.ts`; **H** 401 | EXISTING_VERIFIED + NEW |
| 5 | Network failure | → `provider_network` | `provider.test.ts` (constructed error); **H** "connection refused" (real socket) | NEW_TEST_REQUIRED (closed) |
| 6 | Timeout / abort | `AbortSignal.timeout(20 s)` + outer signal | `provider.test.ts` timeout and disconnect; `live-flow.test.tsx` client timeout; **H** hang → `provider_timeout`, HTTP request aborted | EXISTING_VERIFIED + NEW |
| 7 | Truncated (`max_tokens`) | → `provider_truncated` | `provider.test.ts` | EXISTING_VERIFIED |
| 8 | Schema-invalid JSON | `ModelOutputSchema.strict()` | `provider.test.ts` (7 variants) | EXISTING_VERIFIED |
| 9 | Empty output | → `provider_empty` | `provider.test.ts` | EXISTING_VERIFIED |
| 10 | Refusal / unexpected stop | → `provider_refusal` / `provider_unexpected_stop` | `provider.test.ts` | EXISTING_VERIFIED |
| 11 | Mixed batch | per-record outcomes | `provider.test.ts` "batch policy"; `processing-retry.test.ts` 5; `live-flow.test.tsx` partial success; **H** route handler, mixed 200/529/429 | EXISTING_VERIFIED + NEW |
| 12 | Manual retry after failure | failed-only `startOperation("retry")` | `processing-retry.test.ts` 10–15; `live-flow.spec.ts` recover via Retry; `retry-flow.spec.ts` | EXISTING_VERIFIED |

**Per-case checks:**
- **No fabricated success:** every failure code yields `ok:false`. Existing provider tests check this for all codes.
- **No provider text leaks:** "secret internal detail" and `INTERNAL-PROVIDER-DETAIL-MUST-NOT-SHOW` are asserted absent from the outcome, response body and logs (**H**).
- **Failed items stay visible:** covered by the Failed queue browser tests.
- **Counters reconcile:** `processing-retry.test.ts` 15; `inbox.test.ts`.
- **Retry is never automatic:** M4 mutation proves the SDK setting.
- **Successful retry lands in Pending:** `processing-retry.test.ts` 12.
- **Unrelated records unchanged:** `processing-retry.test.ts` 13/14 and the 30-message test.

## State integrity

| Invariant | Evidence | Status |
|---|---|---|
| Missing outcome → explicit retryable failure | `processing-retry.test.ts` 2; `live-flow.test.tsx` partial | EXISTING_VERIFIED |
| Duplicate outcome → target fails (no first/last-wins) | `processing-retry.test.ts` 3; **mutation M2 killed** | EXISTING_VERIFIED |
| Unexpected key → no mutation; content-free diagnostic | `processing-retry.test.ts` 4, 4b (forged importedId) | EXISTING_VERIFIED |
| Late completion after reset | `processing-retry.test.ts` 7; `live-flow.test.tsx`; `live-flow.spec.ts` | EXISTING_VERIFIED |
| Late completion after new import (key collision) | `processing-retry.test.ts` 8; `retry-flow.spec.ts`; **mutation M1 killed by test 8** | EXISTING_VERIFIED |
| Multiple retry clicks | `processing-retry.test.ts` 9, 9b; `live-flow.test.tsx`; `live-flow.spec.ts` | EXISTING_VERIFIED |
| Edited / approved drafts preserved across retry | `processing-retry.test.ts` 13/14, 8b; `retry-flow.spec.ts` | EXISTING_VERIFIED |
| Original AI output preserved | `transitions.test.ts`; `hiring-claims.test.ts`; **A** lifecycle | EXISTING_VERIFIED |
| Historical safety findings preserved | `results-export.test.ts` (14); `hiring-claims.test.ts` | EXISTING_VERIFIED, with observation **F-HIST** (see `safety-findings.md`) |
| Partial recovery | `processing-retry.test.ts` 30-message; `retry-flow.spec.ts` multiple failures | EXISTING_VERIFIED |
| Internal key is the identity authority | `operation.ts`; test 4b | EXISTING_VERIFIED |

**Mutation M1 note:** with the opId equality check removed, only test 8 failed. The reset tests (7, live-flow) still pass under that mutation, because reset clears `activeOp`, which the `!op` guard rejects anyway. Coverage is adequate, but test 8 is the single test that protects id equality.

## Provider-call ceilings

| Ceiling | Evidence | Status |
|---|---|---|
| ≤2 concurrent calls **per request** | `provider.test.ts` batch policy (peak 2); **H** (peak 2) | EXISTING_VERIFIED |
| No server-wide cap: two concurrent HTTP requests reach 4 in flight | **H** "two independent requests together reach 4" | **KNOWN_LIMITATION** (characterised, not a defect). The endpoint is local-only, and the limit is per request only. |
| No SDK automatic retries | **H** one upstream hit for 429/500/529; **mutation M4 killed** (`maxRetries: 2` → 4 failures) | NEW_TEST_REQUIRED (closed) |
| ≤10 messages per live request | `handler.test.ts` 11 → 413, no call; `live-flow.test.tsx` browser refusal; `live-flow.spec.ts` | EXISTING_VERIFIED |
| Bounded body (64 KiB) and message length | `handler.test.ts` input boundary table | EXISTING_VERIFIED |
| Client-supplied model/system rejected | `handler.test.ts`; `live-flow.spec.ts` "rejects caller-supplied provider parameters and cross-origin calls" | EXISTING_VERIFIED |
| Loopback Host/Origin check | `handler.test.ts`; `live-flow.spec.ts` | EXISTING_VERIFIED. **This is not authentication.** A process on the same machine can still call the endpoint. |

## AI-02C — Adversarial safety

See `safety-findings.md`.
- **Protected (A, 19 tests):** injection flag, delimiter forgery, schema control, hire/offer/selection blocks, withdrawal warning, blocked lifecycle.
- **KNOWN_LIMITATION, pinned with `it.fails`:** KL-1..3.
- **QUALIFICATION_GAP / residual risk, pinned:** R-REJ (new), R-INJ, R-WD, and F-HIST. R-PII is asserted as current behaviour.
- **AI-02 R1 update:** R-REJ → **RESOLVED** (`docs/evidence/day3-ai02-r1/README.md`). The remaining pins (9) are unchanged.
- **OUT_OF_SCOPE:** genuine-model resistance, which needs authorised paid calls.

## AI-02D — Preliminary accessibility

See the `README.md` § Accessibility.
- Chromium (Playwright, headless), 1280×720 desktop, plus existing 390/320 mobile tests.
- Automated checks only. No screen reader was used. This is **not** a WCAG claim.

| Check | Evidence | Status |
|---|---|---|
| Keyboard access to import controls | **P** "keyboard only" | NEW |
| Navigation between views | `app-shell.test.tsx`; `results-flow.spec.ts` keyboard navigation; **P** | EXISTING_VERIFIED + NEW |
| Focus visibility | **P** focus observations | NEW. See findings A11Y-01/02. |
| Focus after retry | `retry-flow.spec.ts` keyboard Retry (focus on `.message.active`); failed retry keeps focus on control | EXISTING_VERIFIED |
| Processing / failure announcements | `#globalLive` polite (**P**); `retry-flow.spec.ts`; `#liveProcessingStatus` role=status (`live-flow.spec.ts`) | EXISTING_VERIFIED + NEW |
| Labels for draft editing and intent correction | **P** accessible names | NEW. Observation A11Y-03. |
| Mobile, empty filtered queue | `inbox.test.ts` UX-04-01; `ui-04-r1` evidence | EXISTING_VERIFIED |
| Retry progress visible at 390px | `live-flow.spec.ts` UX-AI-02 @390; `retry-flow.spec.ts` UX-05A-01 @390 | EXISTING_VERIFIED |
| Screen-reader behaviour | — | QUALIFICATION_GAP → UI-06 |
| Contrast, zoom/reflow | — | OUT_OF_SCOPE → UI-06 |
