# EVAL-04E — Paid evaluation execution proposal (NOT AUTHORIZED)

**Status:** `PROPOSAL_AWAITING_OWNER_PAID_CALL_AUTHORIZATION`.

**Phase A** made no provider call. This document describes the single run that a later, separate owner authorization (Gate 4) could approve.

## Fixed parameters

| Item | Value |
|---|---|
| Frozen dataset | `eval/heldout/day4-candidate-messages-v1.0.json` |
| Dataset SHA-256 | `646128933def19264ef6228bb944083de59e6e2bc4470ef077537d53b674d412` (checked by `assertRunAllowed` before any request) |
| Frozen Git SHA | `8fb8da1117935931b6542b4731700725d5dbe7db` (dataset); execution commit `<to be recorded at run time>` |
| Prompt version | `live-v1` (`src/lib/processing/provider.ts`), unchanged |
| Model | `claude-haiku-5-5` (server `ANTHROPIC_MODEL`); the returned model string is recorded |
| Route and host | `POST http://127.0.0.1:3000/api/process`, served by `next start -H 127.0.0.1` (loopback only; `handleProcess` also rejects non-loopback hosts) |
| HTTP batches | 3, of 10 records each, **sequential** (batch n+1 starts only after batch n returns) |
| Maximum provider invocations | **30**, one per message. Each batch makes 10 calls with at most 2 concurrent (`PROVIDER_CONCURRENCY`) |
| Output token limit per call | 1,600 (`MAX_OUTPUT_TOKENS`); thinking disabled; effort `low`; structured JSON output |
| Timeouts | 20 s per provider call (`PROVIDER_TIMEOUT_MS`); the harness applies no extra timeout |
| Retries | **none**: SDK `maxRetries: 0`, and the harness posts each batch once |
| Inputs sent | `candidate_name`, `subject`, `message`, plus internal `key` and `importedId` only (`toRequestRecord`); no reference-label field |

## Cost (verified price, 30 Oct 2026)

- **Price:** Claude Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens, for prompts up to 100K tokens. Source: https://platform.claude.com/docs/en/about-claude/pricing, fetched 2026-10-30, matching the claude-api skill's table dated 2026-10-06.
- **Expected cost:** about **$0.0086**. The historical genuine mean (n = 5) is about 1,450 input and 230 output tokens per call, so 30 × (1,500 × $0.10 + 270 × $0.50) / 10⁶.
- **Worst case:** about **$0.031**: 30 × (2,200 input × $0.10 + 1,600 output × $0.50) / 10⁶, i.e. every call hits the output cap on a 2,000-character message.
- **Proposed budget ceiling:** **$0.05**. Even the worst case cannot exceed it, because there is a hard 30-call ceiling and no retries.

## Logging and redaction

- **Run record:** `eval/day4/runs/<startedAt>-genuine.json`, written once with flag `wx`. It holds raw first-pass outcomes, provider `meta` (response and request ids, tokens, latency, stop reason, code) and batch status, and no reference labels.
- **Server log:** the server prints only `logOutcome` lines (content-free).
- **Never logged:** API keys or `.env.local` contents.
- **Candidate text:** it is synthetic and is stored in the run record only as the drafts and summaries the model returned.

## Execution steps (for the future authorized operator)

1. Check that the dataset hash and Git SHA match.
2. Start the server with the env `INBOX_PROCESSING_MODE=anthropic` and `ANTHROPIC_MODEL=claude-haiku-5-5`, bound to 127.0.0.1.
3. Invoke `runFirstPass(loadFrozen(raw), { kind: "genuine", url, authorization, post })`.
   - `authorization` is the per-run phrase `EVAL04C-AUTHORIZED-ONE-FIRST-PASS:<sha>`, issued by the owner.
   - `post` is a plain `fetch` to the loopback URL with `content-type: application/json`.
   - **Phase A deliberately ships no CLI wrapper.** The wrapper is part of the Gate 4 slice and needs review.
4. Write the run record. Stop.

## Stop behaviour

The run is a single pass. The operator stops and does not re-run if any of these happen:
- A batch returns HTTP ≠ 200.
- `provider_auth` appears.
- More than 3 consecutive failures occur.
- Reported usage implies a cost above $0.05.

Failed items stay failed in the first-pass record. A recovery run would need a new authorization and is reported separately.
