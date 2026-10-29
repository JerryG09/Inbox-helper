# REQ-03 — Proposed product decisions (AWAITING OWNER DECISION)

**Status:** none of these decisions has been accepted. Each is a Claude Code recommendation drawn from `requirement-audit.md` and `reply-handoff-audit.md`.

| # | Decision | Options | Recommendation | Rationale | Owner decision |
|---|---|---|---|---|---|
| P1 | Intent categories | (a) Keep six fixed intents; (b) make them configurable | **(a) Keep six fixed** | MUST asks for grouping by what the person wants, not for configurable categories. Six intents plus Other / unclear cover typical candidate mail. Configurability would change the prompt, schema, evaluation and frozen UI. Re-evaluate after the Day 4 held-out results. | PENDING |
| P2 | Grouping model | (a) One primary group + secondary intents; (b) list under every intent | **(a)** | Unambiguous queue, reconciling counts, no duplicate review; secondaries remain visible and exported | PENDING |
| P3 | Approved-reply handoff | (a) Review detail + CSV; (b) add a Copy approved reply control | **(a) for the challenge**; (b) as a future, separately authorised UI exception | Already meets "reviewed before it is sent"; (b) needs a parity exception and an approval-only guard | PENDING |
| P4 | Live limit | (a) Keep 10 per request; (b) raise it; (c) automatic chunking | **(a) keep 10**, disclosed | Bounds paid cost and abuse on an unauthenticated local endpoint. The Day 4 evaluation can run 30 messages as 3 × 10. | PENDING |
| P5 | Sending | (a) Preserve no-send scope; (b) add sending | **(a) preserve no-send** | MUST requires review *before* sending, not sending by this tool. Sending needs integrations, authentication and real data, all excluded by the approved intent. | PENDING |
| P6 | Short-reply enforcement | (a) Prompt-only (current); (b) warn above N words; (c) reject | **(a) until Day 4 data**, then decide | 5/5 genuine drafts are under 120 words; there is not enough data to justify a product change | PENDING |

## Potential blocking issues against the MUST wording
**None identified.** The nearest risks are disclosure items, not gaps:
- The 10-message live limit means a large pile has to be split.
- "Short" is requested, not enforced.
- Model grouping quality has not yet been measured on held-out data (Day 4).
