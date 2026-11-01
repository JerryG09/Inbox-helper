# Recording scripts and instructions — for the owner

**Status of both recordings:** `PENDING_OWNER_RECORDING`. Nothing has been recorded. This file is a script, not evidence that a demo happened. The scene plan is in [`recording-shotlist.md`](recording-shotlist.md).

## Before recording (both videos)

1. **Data and secrets:**
   - Use synthetic data only.
   - Close `.env.local`, terminals that show environment variables, and any browser tabs with personal data.
2. **App setup:**
   - Start the app in **simulated** mode: `npm ci && npm run build && npm start`, then open http://127.0.0.1:3000.
   - Simulated mode costs nothing.
   - Do **not** run live Anthropic mode on camera unless you deliberately authorize the cost. For genuine results, show the committed EVAL-04C evidence instead.
3. **Labels:** label every AI output on screen as **simulated**, **local fake provider** or **genuine Anthropic (recorded 30 Oct 2026, EVAL-04C)**.
4. **Stale server:** a stale `next-server` may still hold port 3000 from 28 Oct. Check with `lsof -i :3000` and stop it first if needed.

## Recording 1 — Loom: AI-native engineering workflow (target 4–6 min)

| Time | Show | Say (suggested) |
|---|---|---|
| 0:00 | `intent.md` | "Recruiters triage mixed candidate messages. AI sorts and drafts; a human decides everything; nothing is sent." |
| 0:40 | `Final directive.md` §2, §11 | "These are the boundaries and acceptance rules Claude Code worked under." |
| 1:20 | A daily log, e.g. `docs/daily-log/2026-10-29-day3.md` | "Each slice was a bounded directive with stop rules. Claude implemented, ChatGPT reviewed as architect, and I approved." |
| 2:00 | `docs/evidence/ai-01/README.md` R1/R2 | "Review caught a detector gap that let an offer through. It was fixed with mutation testing." |
| 2:40 | `docs/evaluation/day4-label-adjudication.md` | "I adjudicated 30 labels, nine of them corrections, and froze them before any held-out run." |
| 3:20 | `docs/evidence/day4-eval04c/evaluation-report.md` §§1, 8 | "Haiku scored 25/30 strict against 13/30 for the baseline, but 11 drafts falsely claimed a handoff. Accuracy is not draft safety." |
| 4:20 | README limitations | "SAFE-04 isn't implemented, the newer contrast fixes aren't merged, and there's no WCAG claim." |
| 5:00 | `docs/submission/one-page-unlearning-note.md` | Close with the main lesson. |

## Recording 2 — Five-minute product demo (simulated mode)

| Time | Action | Say |
|---|---|---|
| 0:00 | Load the sample, then upload a CSV with an invalid row | "Synthetic data. Invalid rows are shown and skipped." |
| 0:30 | Add one manual message | "Manual entry uses the same validation." |
| 0:50 | Press **Start AI processing** | "This is **simulated** processing — no model call." |
| 1:30 | Show the grouped inbox, secondary tags and the attention panel | |
| 2:00 | Edit a draft, then approve it; point to "No message was sent" | "Approving changes status only; there is no send path." |
| 2:45 | Show the blocked M003 draft: edit, **Recheck**, then explicit approve | "The detector blocks hiring-outcome wording. Recheck never approves." |
| 3:30 | Retry the failed M005 | "Only failed items are retried." |
| 4:00 | Correct a primary intent; show Results and export the CSV | |
| 4:30 | Show the EVAL-04C table in the README | "Genuine Haiku results, recorded 30 Oct. These are not live on screen." |
| 4:50 | Boundaries | "No sending, no hiring decisions, local only, known P1 draft issues." |

## After recording

1. Set both videos to "anyone with the link can view", then open each link in a private window to check access.
2. Give both URLs to Claude Code or edit them in by hand. Replace these placeholders:
   - in [`FINAL-SUBMISSION.md`](FINAL-SUBMISSION.md): `<LOOM_URL_PENDING>` and `<DEMO_URL_PENDING>`
   - in [`submission-manifest.md`](submission-manifest.md): rows 1 and 6
3. Commit, push, then submit to MUST.
