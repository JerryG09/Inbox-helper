# EVAL-04C — Authorized first-pass evaluation (Day 4)

**Status:** `DAY4_EVAL04C_FIRST_PASS_READY_FOR_ARCHITECT_REVIEW`. Human safety review is pending, and Day 4 remains OPEN.

## Authorization and what was run

The owner's EVAL-04C directive of 30 Oct 2026 authorized one baseline pass and one genuine Haiku first pass, with at most 30 provider calls and an estimated spend of at most US$0.05.

**Executed:** exactly one baseline pass and one genuine pass: **3 HTTP requests and 30 provider calls**, at an estimated cost of **$0.00777**.

**Not done:** no retries, no second pass, no other model.

## Run manifest

| Item | Value |
|---|---|
| Branch | `day4/eval04c-first-pass-evaluation`, from `8fb8da1` (accepted freeze) |
| Run code commit (pre-run) | `f87ac90b377321d83ca709246d793e6a4c7e924e` |
| Evidence commit | reported in the completion message |
| Dataset | `eval/heldout/day4-candidate-messages-v1.0.json`, SHA-256 `646128933def19264ef6228bb944083de59e6e2bc4470ef077537d53b674d412` (unchanged before and after) |
| Draft source | `eval/heldout/day4-candidate-messages-v1.json`, SHA-256 `44c5c904f028255515c76b851297bde72b457314aba0c3af1a6996b2a4da68ac` (unchanged) |
| Product source | `src/` byte-identical to `main` `1991ec0`; prompt `live-v1`; `provider.ts` SHA-256 `f282d8d0…bcecc` |
| Model | `claude-haiku-5-5` (requested and returned for 30/30) |
| Route | `POST http://127.0.0.1:3000/api/process` (IPv4 loopback, `next start -H 127.0.0.1`) |
| Scoring | `day4-protocol-v1` (`eval/day4/score.ts`, `evaluation-protocol.md`) |

## Files

| File | Content |
|---|---|
| `evaluation-protocol.md` | Pre-registered protocol (from Phase A, unchanged) |
| `evaluation-report.md` | Results, case table, AI-assisted draft review, limitations, deviations |
| `run-2026-10-30/baseline-predictions.json` | 30 baseline predictions (single pass) |
| `run-2026-10-30/baseline-scores.json` | Baseline metrics, each with numerator and denominator |
| `run-2026-10-30/genuine-batches.jsonl` | Per-batch outcomes, written incrementally as each batch settled |
| `run-2026-10-30/genuine-run-record.json` | Complete raw first-pass record: outcomes, provider metadata, batch status. No reference labels |
| `run-2026-10-30/genuine-scores.json` | Haiku metrics, draft stats, operations, price, ceiling |
| `run-2026-10-30/server-call-log.txt` | The server's content-free `anthropic_call` lines (30) |

Code: `eval/day4/harness.ts`, `eval/day4/score.ts` and `eval/day4/run-first-pass.ts`. Tests: `test/live/day4-eval-harness.test.ts` (19, fake provider, fabricated fixtures).

## Provenance

| Kind | Items |
|---|---|
| **Genuine** | `genuine-*` and `server-call-log.txt` |
| **Deterministic** | `baseline-*` |
| **Fake provider** | the unit tests and the pre-run HTTP rehearsal. Fabricated messages only; outputs not committed |
| **AI-assisted** | the draft safety table in the report (Claude) |
| **Pending** | independent human safety review |

## Environment note

- **Stale server:** a separate, pre-existing `next-server` (PID 14222, started 28 Oct from the main worktree) is listening on `*:3000` over IPv6, in simulated mode (it returned 409).
- **Not used:** the run targeted IPv4 `127.0.0.1` explicitly, and that process was neither used nor modified.
- **Recommendation:** the owner may want to stop it.
