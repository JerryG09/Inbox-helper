# Owner sign-off supersedes the original pending status

**26 October 2026: Hi-fi V1.1 was visually approved by the user.** **Approved baseline is frozen with zero unapproved design disparity.** The retained handoff below describes the same prototype before formal sign-off; its references to owner approval being pending are superseded by this notice.

---

# MUST Quest — Candidate Inbox Helper
## Hi-fi V1.1 · Correction pass and design handoff

**Date:** 26 October 2026  
**State:** Functional design review candidate; awaiting owner visual sign-off. **This is an offline interactive UX prototype, not a working AI application.**  
**Baseline:** Low-fi V0.3 frozen user journey + Hi-fi V1.0 visual identity retained.

### Design freeze proposal

- Three views: **Import → Inbox & Review → Results**; simulation/progress remains an Import state.
- Desktop: navy navigation, light surface, split message queue + review panel.
- Mobile: list → detail route with **All messages** and **Jump to reply** controls. The approve/reject area appears **after** the draft, not over the message content.
- Candidate's original text, predicted intent(s), attention evidence, original AI output, current edited draft and human review decision remain distinct.
- No automatic message sending, no genuine recruitment decisions, no live provider, authentication or database.

### V1.0 issues fixed in V1.1

| Finding | Change | Verification |
|---|---|---|
| UX-R01 current vs historical safety finding | Separate `current_attention_state`, `current_attention_reasons`, and `historical_ai_findings` in Results/CSV; corrected draft keeps original AI output and history | Reviewed sample M003, corrected draft, approved, inspected Results and CSV; after editing again, current blocker reactivated |
| UX-R02 second intent silently lost | When selecting an existing secondary as primary, the previous primary is retained as secondary | M002 swap preserves scheduling and technical intents |
| UX-R03 edit leaves Approved-filter queue stale | Queue rows, filter selection, summary counts and review badge derive from current state on each editor change without replacing focused textarea | Edit M004 on Approved filter; status switches to Pending and queue updates immediately |
| UX-R04 sample ID collision | Mock fixture outputs require exact fixture fields, not ID alone; arbitrary inputs use clearly labeled rule-based placeholders | Custom message ID M001 withdrawing is not assigned Ada's scheduling response |
| SEC-R05 CSV formula injection | Spreadsheet-oriented CSV escaping prepends apostrophe to suspicious cells; export labels this as a prototype mitigation | Formula-like name and message begin with apostrophe in decoded CSV cell |
| UX-R06 keyboard focus | Primary intent and secondary checkbox focus restored after re-render; status announcements via live region | Focus confirmed in Chromium |
| UI-R07 small/low contrast text | Increased working text sizing and foreground contrast, especially message subjects and metadata | CSS/computed-style spot check, subject and metric metadata readable at common zoom |
| UI-R08 mobile decision placement | Compact detail chrome; added Jump to reply; actions remain below draft rather than overlaying content | 320/390/768px layout and jump tested |
| UX-R09 final pending item | Filter-empty state says 'All AI-completed messages reviewed' and links to Results, while separately noting outstanding AI failures | Simulated all completed records reviewed |
| AI-R10 safety-check overclaim | Reworded as **limited mock phrase check**, explicitly not a safety certification | Unsafe draft remains blocked until edit + mock recheck; human approval always required |
| COPY-R11 data routing confusion | Distinguishes local CSV preview from future server/model provider processing | Import helper copy reviewed |

### Data and status contract

- Processing: Queued / Processing / Completed / Failed.
- Human review only on AI-completed messages: Pending / Approved / Rejected draft.
- Current attention: blocked / active warnings / corrected and pending or approved / none.
- Original model findings remain in history even after a particular issue is cleared. Approval of a corrected draft **does not certify model safety**.
- `valid total = queued + processing + completed + failed`; `completed = pending + approved + rejected`.
- Every generated draft starts Pending. Approval never sends a message. Editing an approved or rejected response resets to Pending. For initially blocked output, editing reactivates the block until explicitly rechecked.

### Accepted UX cases (browser-simulated)

1. Normal message → AI-simulated result → human approval.
2. Multi-intent message → swap primary with secondary without losing either need; keyboard focus maintained.
3. Unsafe draft → blocked → human edits → limited mock check → explicit approval; original unsafe text retained in historical record.
4. Partial AI failure → completed messages remain reviewable → retry only failed record; previous human edits and approvals retained.
5. Approved-filter edit → Pending filter and counts update immediately without losing textarea focus.
6. Arbitrary message with a sample ID → generic labeled simulation based on input, not fixture ID.
7. Spreadsheet-formula-like candidate text → sanitized during CSV export.
8. Completed queue → clear completion state and honest outstanding AI-failure reminder.

### Browser checks

Automated Chromium walkthroughs passed on **1440px desktop** and **320px, 390px, 768px responsive viewports**; no script errors or document-wide horizontal overflow in the tested flows. This is not a comprehensive accessibility/security audit. Confirm contrast and keyboard support with human testing and an accessibility tool during implementation.

### Not implemented / not claimed

- No real model or provider calls, grounded inference, latency or cost measurements.
- No real permission/authentication, database, production API, PII handling or server-side safeguards.
- CSV apostrophe escaping is a prototype defense to verify against target spreadsheet applications; it is not a guarantee for all CSV consumers.
- Prototype's mock phrase check is incomplete by design; a nonmatching unsafe claim could pass. Human inspection remains essential.
- No final owner approval of the visual design yet.

### Handoff to next gate

After owner sign-off, prepare the **UI implementation contract** from this approved design, then the **five-day execution contract** with observable daily outputs and all seven MUST deliverables. Do not start the MUST timer without the user explicitly doing so.
