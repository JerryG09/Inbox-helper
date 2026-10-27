# MUST Candidate Inbox Helper — UI Implementation Contract V1.1.1 (AI-Native Git Delegation)

**Design baseline:** Hi-fi V1.1, visually approved by the product owner on 26 October 2026.  
**Functional baseline:** Low-fi V0.3 and four scenario-based user journeys.  
**Change policy:** **ZERO UNAPPROVED DESIGN DISPARITY.**  
**Contract stage:** Quest activated on 27 October 2026, around 08:52 WAT; implementation may proceed within approved Day 1 slices. Git delegation governed by §12 below.  
**Canonical artifact:** `prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html` in the frozen reference ZIP, validated using SHA-256 manifest.  
**Scope:** UI implementation and typed workflow behavior. Real AI integration is a later seam, never to be misrepresented by the mock. This revision changes Git delegation only; approved V1.1 design artifacts remain unchanged.

## 1. Meaning of “0% disparity”

The engineer must implement the **approved V1.1**, not an inspired redesign:

- **0 unapproved alterations** to navigation, hierarchy, panel proportions, typography intent, colors, spacing, controls, content order, state labeling, icons, message list organization, mobile behavior, or responsive breakpoints.
- Preserve all three screens: **Import**, **Inbox & Review**, **Batch Results**. Processing is **a state**, not a fourth screen.
- Use the **reference HTML and CSS as the source of truth**. Initially carry over the actual styles and DOM layout faithfully when extracting React components. Do not replace the visuals with generic Tailwind components or an unrelated UI kit.
- No subjective "improvements," new layouts, extra pages, component embellishment, branding changes, or typography substitutions without an explicit, recorded owner-approved design change.
- The implementation must produce **side-by-side screenshot parity** against the canonical images in matching viewport/browser conditions, with a documented visual diff. In a fully deterministic browser environment, target zero pixel discrepancies after the same fonts/content/state are loaded. Across OS/font/renderers exact raster identity cannot be guaranteed; this does **not** waive any observed *design* divergence. A material mismatch is **NO-GO**, not "close enough."
- Accessibility or technical fixes may require a deviation. Document what differs and seek owner sign-off **before** freezing those changes.

**Parity rule:** no silent compromises. If matching a design conflicts with correctness, flag it for an explicit design decision; do not hide the trade-off.

## 2. Frozen visual references

| Screen or state | Desktop reference | Mobile reference | Evidence purpose |
|---|---|---|---|
| Import, empty | `desktop/01-import-empty-1440.png` | `mobile/01-import-empty-390.png` | Two entry methods, navigation, hierarchy |
| Inbox + normal review | `desktop/02-inbox-review-1440.png` | `mobile/03-review-detail-390.png` | Main visual baseline and human decisions |
| Inbox message list | In desktop inbox screenshot | `mobile/02-inbox-list-390.png` | One-pane mobile list and navigation |
| Unsafe AI draft | `desktop/03-blocked-draft-1440.png` | `mobile/04-blocked-detail-390.png` | Attention visibility, blocked approve |
| Results | `desktop/04-results-1440.png` | `mobile/05-results-390.png` | Truthful completed/failed/reviewed states |
| Responsive checks | `desktop/02-inbox-review-1440.png` | `mobile/06-detail-320.png`, `mobile/07-detail-768.png` | Breakpoint behavior and no overflow |

Screenshots are state-based reference images, not a substitute for testing real interactions. The **HTML** is authoritative when a static screenshot does not show focus, hover, empty states, interactions, or accessible names.

**Desktop reference:** Chromium, 1440px viewport width, 1x device scale. **Mobile reference:** Chromium, 390px viewport width, 1x device scale. Regression also covers 320px and 768px. Recreate the exact same synthetic sample state for comparisons. Screenshots are full-page, so their image height is **not** the viewport height.

## 3. UI architecture — frozen

| Area | Approved UI contract | Must not become |
|---|---|---|
| App shell | Navy left sidebar at desktop; compact horizontal nav at mobile; approved wordmark and badges | Different navbar, marketing landing page, new design system |
| Import | CSV upload + manual entry, sample data load, validate before invoking AI, row-error preview | Automatic import/send or unsupported sync |
| Processing | Clear per-item queued/processing/completed/failed status, progress, partial recovery | Permanent independent page or simulated success presented as AI |
| Inbox queue | Group by **primary intent**; independent processing/review filters and attention selector | Multiple copies of one multi-intent message |
| Review pane | Original message → editable AI assessment → attention & safety → editable reply → human actions | Auto-send workflow, AI chat sidebar, hidden original candidate text |
| Results | Distinct batch processing/review totals, item statuses, current vs historical warnings, CSV export | Analytics expansion or false "all processed" statement |
| Mobile | List-to-detail navigation; **All messages**, **Jump to reply**; action buttons *below* draft | Overlaid sticky approval controls obscuring message |

In all layouts, preserve the original message and editing controls as the principal focus. No import of actual candidate data is required for the hiring demonstration; use synthetic examples.

## 4. Design-to-code component boundaries

```text
src/
  app/
    page.tsx                         # One-screen state machine / route shell
    api/process/route.ts             # Server-side provider adapter seam (later)
  components/
    AppShell.tsx                     # Desktop sidebar and mobile top navigation
    ImportWorkspace.tsx              # CSV/manual input and validation preview
    ProcessingStatus.tsx             # Batch progress, failures, retries
    InboxWorkspace.tsx               # Queue + review layout
    MessageQueue.tsx                 # Intent groups and independent filters
    CandidateReview.tsx              # Candidate source and editable assessment
    AttentionPanel.tsx               # Current issue/blocker + historical issues
    DraftReviewActions.tsx           # Pending/approve/reject/recheck
    ResultsWorkspace.tsx             # Counts and CSV export
  lib/
    domain/types.ts                  # Typed data contracts
    domain/transitions.ts            # Pure immutable state transitions
    import/parse-csv.ts              # Input validation and unique record keys
    export/export-csv.ts             # Formula-safe CSV serialization
    processing/processor.ts          # Adapter interface
    processing/mock.ts               # Clearly labeled deterministic fixture
    processing/provider.ts           # Later: server-only real AI
  styles/
    hifi-v1.1.css                    # Source-fidelity styling before refactoring
  test/
    domain/
    ui/
    e2e/
    visual/
```

**Component implementation rule:** extract into React without changing the rendered visual hierarchy. Stable CSS class names and tokens from approved HTML should be retained while parity is being established. Tailwind may exist for infrastructure but must **not** visually overwrite the approved design. Use strict TypeScript, Zod schemas, Vitest unit/integration checks, and Playwright workflow/visual tests.

## 5. Canonical state model

```ts
type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';
type ReviewStatus = 'pending' | 'approved' | 'rejected';
type AttentionSeverity = 'none' | 'warning' | 'blocked';

type InboxRecord = {
  key: string;                   // internal unique identity, not user CSV id
  importedId: string;            // user-supplied id, may collide across imports
  candidateName?: string;
  subject?: string;
  message: string;               // immutable original candidate message
  processing: ProcessingStatus;
  error?: { code: string; description: string };
  primaryIntent?: Intent;
  secondaryIntents: Intent[];
  aiSummary?: string;
  originalAiDraft?: string;      // preserved verbatim
  currentDraft?: string;        // human-editable
  review?: ReviewStatus;        // only if processing === 'completed'
  attention: AttentionSeverity;
  currentAttentionReasons: string[];
  historicalAiFindings: string[];
  needsRecheck: boolean;
};
```

**Invariants — hard acceptance tests:**

1. `valid = queued + processing + completed + failed`.
2. `completed = pending + approved + rejected`.
3. Every newly completed AI item starts **Pending**, regardless of the mock/provider outcome.
4. A message appears in precisely one primary-intent group. Secondary intents are visible but do not duplicate the record.
5. Switching the primary to an existing secondary intent moves the former primary into secondary intents; no valid intent is lost.
6. Editing approved/rejected reply resets review to Pending **immediately**, updating queue selection, counts, Results and export.
7. No empty or current-blocked draft can be approved. Known blocked output requires edit + explicit recheck + human approval; limited automated checks are not a guarantee.
8. A retry only reprocesses failed records; already-reviewed records, edits, and history remain untouched.
9. Retain original model draft and historical findings even after correction; distinguish active attention from resolved historical concern.
10. Import IDs alone can **never** select canned model outputs. Fixture binding requires exact synthetic fixture content; custom messages must be correctly isolated.
11. Rejected means **rejected AI draft**, never candidate rejected from hiring.
12. All export fields reflect their actual underlying state and safely encode formula-like CSV data. No real send mechanism exists.

## 6. Explicit screen-state matrix

- **Import:** no file; selected file; valid rows; partially invalid rows; no valid rows; manual message; duplicate IDs; file parsing failure; processing in progress; partial success; recoverable provider failure.
- **Inbox & Review:** no messages; groups by primary intent; all/specific processing status; all/pending/approved/rejected review filters; attention-only filter; multi-intent message; corrected classification; warning, blocker, corrected warning; AI failure; draft edited after approval; completed queue; no items matching active filters.
- **Results:** completed vs failed counts, review pending vs approved vs rejected, historical vs current attention, partially reviewed export, finished-review summary, and no-data state.
- **Responsive:** 320px, 390px, 768px, 1440px. Mobile list and detail are navigational states. No full-page horizontal overflow. No critical control hidden below an overlay.

## 7. Build boundary and AI responsibility

The UI must depend on an interface such as:

```ts
type ProcessBatch = (messages: ValidMessage[]) => Promise<ProcessOutcome[]>;
type RetryMessage = (recordKey: string) => Promise<ProcessOutcome>;
```

A local deterministic mock is necessary for repeatable UI and screenshot tests; **label it honestly as simulated**. A later real model implementation must call server-side, validate input and output, bound batch size/concurrency/retries, avoid secrets in logs, and expose errors per message. The UI implementation cannot claim a production AI integration when running on mock data.

Avoid database/authentication, emails, ATS integrations, RAG, agent swarms, new screens, bulk approvals and background infrastructure during this challenge. Do not request real candidate data.

## 8. Implementation slices and exit gates

| Slice | Deliverable | Exit gate |
|---|---|---|
| UI-00 | Freeze package integrity, repository scaffold, screenshot regression harness | Reference SHA-256 verified; baseline screenshots reproducible |
| UI-01 | Shell, CSS tokens, nav, responsive structure | Visual parity for empty Import and navigation at 1440/390 |
| UI-02 | Import, CSV/manual validation and progress UI | Empty/malformed/mixed-valid input handled; Import parity |
| UI-03 | Intent-grouped inbox and selection/filtering | Parity of queue and desktop/mobile list; counts and no duplicates |
| UI-04 | Review pane, corrections, blockers, transitions | Normal/multi-intent/unsafe cases pass; desktop/mobile detail parity |
| UI-05 | Failures/retry and Results/export | Partial failure & preserve-human-work tests pass; Results parity |
| UI-06 | Visual and behavioral qualification | **0 unresolved unapproved design discrepancies**, all P0 tests pass, evidence recorded |

The slices are **implementation boundaries, not five quest days**. Integrate them later into the five-day plan while leaving adequate time for AI evaluation, unlearning documentation, and the Loom demo.

## 9. Tests required before UI implementation sign-off

**P0 (all mandatory):**

- Normal message → AI completed/Pending → explicit human approval → accurate export.
- Multi-intent correction retains all valid intentions and preserves keyboard focus.
- Edit an Approved reply while Approved filter is active → moves to Pending, resets correct filters/counts without losing edit focus.
- Custom content sharing a sample ID does not inherit sample classification or draft.
- Unsafe model suggestion → blocked → corrected draft → explicit recheck → human approval; historical model finding preserved.
- 30 messages with 27 mock successes and 3 failures → only the three failed items retried; no approval or edited draft lost.
- Empty draft disabled for approval; rejected draft semantics accurate; no outbound send code path.
- CSV export neutralizes common spreadsheet-formula prefixes according to the documented contract; tests include leading whitespace and delimiter/quote/newline characters.
- Current vs historical attention in Results reconciles with the review pane.
- Screenshot parity checked against each reference in §2, with **no unapproved differences**.

**P1 (do not silently waive):** keyboard focus, visible focus, labeled forms, live processing/status announcements, reduced motion, no horizontal overflow at 320/390/768/1440, mobile back/Jump to reply, empty and finished states, 200% zoom spot-check, readable text contrast.

## 10. Acceptance evidence required from implementation agent

Deliver one review packet containing:

1. Remote branch, pushed Git commit SHA(s), commit author/committer metadata as recorded by Git, changed-file manifest and working run/test commands.
2. Before-and-after screenshots for each of the canonical views, captured at the **same viewports and synthetic states**.
3. Automated visual diff report (pixel counts / regions / percent) and manual side-by-side review; explicitly enumerate any discrepancy. Do not report zero disparity if there are differences.
4. Tests and exact results for P0 and P1; known issues with reasons and remediation decision.
5. Explicit confirmation of **no unauthorized changes** to design source or workflow and **no sending functionality**.
6. Explicit mock-vs-real-AI status and any provider/network/privacy concerns.
7. One concise summary explaining what was delegated to AI and what the engineer independently verified, to help preserve MUST challenge evidence.

**Release verdict:** `GO_FOR_REAL_AI_INTEGRATION` only if all P0 tests pass, the design parity gate shows zero unapproved discrepancies, and any P1 exceptions are explicitly accepted. Otherwise `NO_GO`, with identified blockers. Do not merge/deploy unreviewed visual changes.

## 11. Decision and timer boundaries

- **Hi-fi V1.1:** owner-approved and frozen. No design iteration authorized by this contract.
- **UI implementation:** Day 1 may proceed using the bounded, owner-approved implementation slice; Claude may implement, test, commit and push according to §12.
- **Five-day challenge timer:** confirmed started 27 October 2026 around 08:52 WAT from owner screenshots. Estimated deadline 1 November 2026 around 08:52 WAT; the live MUST timer is authoritative.
- **Five-day execution contract:** V1.1 is locked as the minimum baseline; record daily actuals and stretch additions without retroactively changing original goals.

**Design freeze rule:** There is ONE approved Hi-fi V1.1 baseline. Any modification must be requested, justified, separately approved, and versioned as an explicit change. No silent drift.


## 12. AI-native engineering and delegated Git operations — owner-approved policy, 27 October 2026

**Supersedes any earlier instruction stating: “No AI-generated commits, pushes, or pull requests.”** Such a ban is no longer the project rule.

### Allowed after approval of a bounded implementation task

1. The owner assigns or approves a concrete slice (for example, `DAY1-01 / UI-00 + UI-01`) and its acceptance criteria **before implementation**. The owner’s authorization for that slice permits Claude to implement, run checks, create commits, and push the resulting work to a **dedicated feature branch** in `JerryG09/Inbox-helper`.
2. Claude may create and name the task branch, author normal Git commits, and push that branch. Prefer small, meaningful commits. No force-pushing, resetting shared history, modifying Git identity, or rewriting committed history without new explicit authorization.
3. Claude must not merge a pull request, push directly to protected `main`, deploy, touch unrelated projects, change the approved Hi-fi V1.1 reference, or expand the assigned scope. Opening a **draft PR** is allowed only if the owner explicitly requests it for that slice; opening a PR does not authorize merging.
4. If tests fail, the UI differs from the locked references, an unsafe change is needed, or work falls outside approved scope, Claude must **stop and report the blocker** rather than quietly committing/pushing the questionable change as if it were approved. Where a change is within the approved slice but incomplete, report it as incomplete; do not claim an acceptance gate passed.
5. After every pushed checkpoint, Claude returns an exact handoff: branch and remote, full commit SHA(s), commit URL(s), files changed, concise diff summary, commands run with real test results, screenshot/visual parity findings, limitations, secrets/privacy checks, and what AI did versus what the human independently verified. Use concise citations or paths to the raw evidence.
6. The owner and ChatGPT may independently review the **pushed branch** against the locked scope. Final approval for merging, deployment, or MUST submission belongs to the owner.

### Attribution and evidence

- Delegating commits to Claude is part of the AI-first workflow. **Do not misrepresent assisted work as unaided human implementation.** Record Claude involvement, accepted/rejected suggestions, and human verification in the dated daily log and one-page unlearning note.
- Preserve accurate Git author/committer metadata according to configured repository policy; do not spoof identities or falsify timestamps. Commit identity alone does not establish who did the coding, which is why daily logs explicitly describe AI involvement.
- The project may exceed its daily minimums through dated, reviewed stretch addenda, but MUST's seven deliverables, challenge timeframe, truthful measurement, and the zero-unapproved-design-drift rule remain fixed.

### Day 1 handoff criterion

Claude may implement/test/commit/push **only `DAY1-01`** until the owner authorizes the next slice. Return `READY_FOR_REVIEW` with immutable SHA and evidence. The owner then reviews before merge or further scope expansion.
