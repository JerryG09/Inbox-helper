# EVAL-04 preparation (Phase A)

| File | Status |
|---|---|
| `owner-label-review.md` | **SUPERSEDED_BY_OWNER_ADJUDICATED_V1.0.** Historical only; it holds Claude's original proposals. It is not ground truth and must not be used for scoring. Canonical reference: `eval/heldout/day4-candidate-messages-v1.0.json` at `8fb8da1` |
| `evaluation-protocol.md` | Pre-registered metrics. Copied unchanged into EVAL-04C (`f87ac90`) before the run, and used there |
| `paid-run-proposal.md` | Superseded by the authorized EVAL-04C execution (`08b77e4`: 30 calls, $0.00777) |

**Adapter.** `eval/day4/harness.ts` and `test/live/day4-eval-harness.test.ts` on this branch are the **earlier Phase A form**, with 18 tests. EVAL-04C extended them (per-batch hooks, `not_attempted`, 19 tests), and that extended version is the one the accepted run used. On integration, keep EVAL-04C's copies (see `docs/evidence/day4-eval04a/README.md`).

**Held-out data.** This branch never processed the 30 held-out messages, and it contains no frozen file.
