# Recording shot list (plan only — nothing recorded yet)

Rules for both recordings:
- Synthetic candidates only.
- Never show `.env.local` or the API key.
- Label every AI result on screen as **genuine Anthropic**, **local fake provider** or **simulated**.
- Never present a fake or simulated response as a model response.

Legend:
- **LIVE**: can be performed live in the running app.
- **EVIDENCE**: shown from committed evidence (file, screenshot or log).
- **PAID**: performing it live requires an authorised genuine call.

## Recording 1 — AI-native engineering workflow (Loom)

| # | Scene | What to show | Source | Mode |
|---|---|---|---|---|
| 1 | The original problem | Recruiters triaging mixed candidate messages; risk of unsupported hiring statements | `docs/intent.md` | EVIDENCE |
| 2 | Intent and constraints | No auto-send; human approval; synthetic data; local-only live endpoint | `docs/intent.md`; `MUST-Inbox-Helper-UI-Implementation-Contract-V1.1.1-AI-NATIVE.md` | EVIDENCE |
| 3 | Claude delegation | A bounded directive (scope, stopping rules) and how Claude Code executed it | Day 1–3 daily logs; this Day 3 directive record in `docs/daily-log/2026-10-29-day3.md` | EVIDENCE |
| 4 | Human / architect review | Acceptance gates, owner-authorized exceptions (UX-04-01, UX-AI-01/02) | `docs/evidence/ui-04-r1/`; commit `6ebc7fb` | EVIDENCE |
| 5 | A real defect found by review | The detector let an unverified offer through, then a tag question (P0) | `docs/evidence/ai-01/README.md` (R1/R2 sections) | EVIDENCE |
| 6 | R1/R2 correction and mutation testing | Shared detector; mutations killed; Day 3 mutations M1–M4 | `7d1c0f0`, `9d34948`; `docs/evidence/day3-ai02/README.md` | EVIDENCE (optionally LIVE: run `npx vitest run test/live/hiring-claims.test.ts`) |
| 7 | Assumptions that changed | Exploratory 30-message relabelling lesson; "green suite ≠ protected" (Day 3 R-REJ) | `docs/unlearning/` | EVIDENCE |
| 8 | Final result and limitations | Residual risks, per-request concurrency only, no WCAG claim, Day 4 held-out evaluation | `safety-findings.md`; submission manifest | EVIDENCE |

## Recording 2 — Five-minute product demonstration

| # | Time | Scene | Mode | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:30 | Import the 6-message sample / a synthetic CSV; validation preview with invalid rows | LIVE | Simulated or live server |
| 2 | 0:30–1:15 | AI processing | **EVIDENCE** for genuine results, using the Day 2 screenshots and `live-call-metadata.jsonl`. A live genuine run is **PAID** and needs explicit authorisation. | Label "genuine Anthropic, recorded 28 Oct 2026". |
| 3 | 1:15–2:00 | Inspect the grouped inbox, classifications, secondary intents and draft | LIVE (simulated) or EVIDENCE (genuine) | Name the source on screen |
| 4 | 2:00–2:45 | Human edit → Pending → explicit approval; "No message was sent" announcement | LIVE | |
| 5 | 2:45–3:30 | Safety-blocked draft: edit, recheck, then approve | LIVE via the **local fake provider** (`[[offer]]` marker) or simulated M003 | Say on screen "fake provider, not a model response" |
| 6 | 3:30–4:10 | Failed-only retry (M005 or a fake `[[fail-once]]`) | LIVE (simulated / fake) | |
| 7 | 4:10–4:40 | Results and CSV export | LIVE | |
| 8 | 4:40–5:00 | Boundaries: drafts never sent automatically; no hiring decisions; synthetic data; local-only endpoint | LIVE / narration | Mention the known detector limitations |
