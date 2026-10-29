# Day 3 — AI-02 reliability and safety qualification (evidence)

**Branch and base:** `day3/ai-02-reliability-evidence`, from `main` = `6a23fe281e45769ae10bd00872b823ecb97dd2de` (verified equal to `origin/main` before work began).

**Scope:**
- This slice is qualification and evidence only.
- **No product source, CSS, prompt, model or provider parameter changed.**
- **Zero genuine provider calls**: `test/live-acceptance/` was not run.
- No merge, PR or deployment.

**Who did what:** Claude Code (`claude-opus-5-5`) wrote the tests and documents and ran every command below. All results are **Claude-reported and not yet independently rerun.**

**Environment:**
- macOS (Darwin 25.6.0, arm64), Node, Vitest (jsdom; the new HTTP test uses `@vitest-environment node`).
- Playwright Chromium headless, deviceScaleFactor 1, projects `simulated` (:3100) and `live-fake-upstream` (:3101, fake key, `ANTHROPIC_BASE_URL` → `test/support/fake-anthropic.mjs`).
- `playwright.config.ts`, `test/support/` and the existing visual specs are unchanged from main.

## Documents
- `qualification-matrix.md` — requirements-to-evidence audit (AI-02A/B/D) with status classes.
- `safety-findings.md` — adversarial matrix, residual risks, proposed corrections (AI-02C).
- `performance-notes.md` — genuine-provider latency, tokens and estimated cost (AI-02E; historical data, n = 5).

## New tests (no production code touched)

| File | Tests | What it adds |
|---|---|---|
| `test/live/provider-http.test.ts` | 8 | The real Anthropic SDK client against an in-process HTTP fake on 127.0.0.1:<br>- 429/500/529/401 map to safe codes with **exactly one** upstream request.<br>- Connection refused gives `provider_network`; a hang gives `provider_timeout` and the request is aborted.<br>- A mixed batch through `handleProcess`.<br>- No provider text or key leaks.<br>- Concurrency scope: 2 per request, 4 across two requests. |
| `test/live/adversarial-safety.test.ts` | 33 (19 + 14 `it.fails`) | Adversarial matrix. Residual risks are pinned as expected failures. |
| `test/visual/a11y-preliminary.spec.ts` | 5 (4 + 1 `test.fail`) | Keyboard reach, accessible names, focus observations, polite announcements. A11Y-02 is pinned. |

## Mutation-sensitivity checks

Each mutation was applied to `src/` with a scripted single-occurrence replacement. The named tests were run, then the file was restored with `git checkout`. `git status src` was clean afterwards, and no mutation is in the diff.

| ID | Safeguard defeated | Change | Result |
|---|---|---|---|
| M1 | Stale-result rejection (`state.ts` `settleWith`) | `if (!op \|\| op.id !== opId)` → `if (!op)` | **Killed.** 1 failure: `processing-retry.test.ts` "8. a result from an older import cannot mutate a newer batch…". Reset-path stale tests still passed, because reset clears `activeOp`. |
| M2 | Duplicate-outcome protection (`operation.ts` `reconcile`) | `if (mine.length > 1)` → `if (false)` | **Killed.** 2 failures: tests 3 (duplicate) and 5 (mixed batch). |
| M3 | Blocked-draft approval restriction (`transitions.ts` `canApprove`) | removed `&& r.attention !== "blocked" && !forbiddenDraft(draft)` | **Killed.** Many failures across `transitions.test.ts`, `hiring-claims.test.ts` and `adversarial-safety.test.ts`. |
| M4 | No SDK automatic retries (`provider.ts` `sdkCreate`) | `maxRetries: 0` → `maxRetries: 2` | **Killed.** 4 failures in `provider-http.test.ts`: 429, 500 and 529 each saw extra hits, plus the mixed batch. |

## Reliability findings (AI-02B)
- Every failure-matrix case (12/12) yields an explicit failed outcome with a safe description. None fabricates success.
- Retry is never automatic: the SDK setting is now proven on the wire (M4).
- Every state-integrity invariant is covered by an existing test (see matrix).
- **No new reliability defect was found.**
- **KNOWN_LIMITATION:** the 2-call concurrency cap is per HTTP request. Independent concurrent requests are not globally limited (4 in flight observed). The endpoint is local-only and loopback-checked. **Loopback Host/Origin checks are not authentication.**

## Safety findings (AI-02C) — summary
- **Protected:** injection flagging, delimiter forgery, schema control, hire/offer/selection claims, the blocked-draft lifecycle.
- **Residual risks (pinned):**
  - KL-1..3 (already documented)
  - **R-REJ (new): plain rejection statements are undetected**
  - R-INJ, R-WD, R-PII
  - Observation F-HIST
- Details and proposed corrections are in `safety-findings.md`.

## Preliminary accessibility (AI-02D)

**Method:** Playwright Chromium headless, 1280×720 default desktop viewport (Desktop Chrome device), simulated mode.
- Focus state was read via `getComputedStyle` after real `Tab`/`Shift+Tab` key presses.
- Existing 390/320 mobile and keyboard tests were reused.
- **No screen reader was used. No contrast measurement was made. This is not a WCAG 2.2 AA claim.**

| ID | Observation | Evidence | Severity (preliminary) |
|---|---|---|---|
| — | Navigation, CSV input, sample buttons and manual fields are reachable by Tab; Enter activates "Load 6-message sample" | `a11y-preliminary.spec.ts` "keyboard only" | Pass |
| — | Draft editor, Primary intent and both queue filters have accessible names; each secondary checkbox has label text | same, "accessible names" | Pass |
| — | `#globalLive` is `role=status` / `aria-live=polite`; retry success is announced | same; also `retry-flow.spec.ts` | Pass |
| A11Y-01 | Focused `.field` inputs and `#draftEditor` compute `outline: none`. Their only indicator is a `0 0 0 3px rgba(108,117,242,0.11)` ring. The global `:focus-visible` outline is overridden by the later `.field … {outline:none}` rule. | Measured values from the "focus visibility observations" console output | Likely insufficient focus visibility. Needs a UI-06 contrast measurement. |
| **A11Y-02** | Keyboard focus on the CSV file input lands on a 1×1 `sr-only` element. Its visible label "Choose local CSV" shows no focus change, so focus is effectively invisible on the primary import control. | `test.fail` "A11Y-02 …" (reproducible) | **Defect candidate.** Bounded fix proposal: a `:focus-within` / `input:focus-visible + label`-style indicator. Not implemented, because CSS changes are out of scope. |
| A11Y-03 | "Secondary intents" is a `<label>` with no control. The checkboxes are not grouped (no `fieldset`/`legend` or `role=group`). "Review status" is likewise a `<label>` without a control. | spec asserts `group` count 0 | Minor; UI-06 |

## Gate results
See `docs/daily-log/2026-10-29-day3.md` § Verification for exact commands and counts.

## Limitations
- Every new result is fake, simulated or unit-level. Nothing here measures genuine model behaviour.
- The HTTP fake reproduces Anthropic status codes and error shapes, but not every real header or timing behaviour (e.g. `retry-after`).
- The adversarial matrix is a bounded, hand-written sample, not exhaustive.
- Accessibility checks are preliminary; see the table above.
- No new screenshots were captured: existing UX-AI-02 @390 and UI-05A evidence already cover the visible retry progress.
