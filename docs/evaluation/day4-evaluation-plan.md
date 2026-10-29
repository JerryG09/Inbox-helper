# Day 4 evaluation plan (proposed; requires owner label freeze and paid-call authorisation)

**Status:** the target Haiku evaluation has **not** been run on the held-out dataset. Claude generated the synthetic messages and proposed labels, so they are not independent human ground truth. The owner must adjudicate and freeze the labels before the first evaluation run.

## Preconditions (all required before any model call)
1. The owner has adjudicated `docs/evaluation/day4-label-adjudication.md`.
2. The frozen file is committed and its SHA-256 recorded.
3. A paid run is explicitly authorised, with a budget.
4. The configuration is recorded in the run file:
   - model `claude-haiku-5-5`, plus the model string the provider actually returned
   - prompt version `live-v1` (unchanged), `max_tokens` 1,600, thinking off, structured output
   - 20 s timeout, concurrency 2, no automatic retries
   - git SHA, dataset SHA-256, start and end timestamps

## Runs
- **Baseline:** the deterministic keyword baseline (`npm run eval:baseline` logic) over the same frozen 30 messages. No cost.
- **Model:** one first pass. **The execution path must be chosen and recorded before the run.** It is one of:
  - **(A) Product batch handler (recommended).** Three bounded requests of ten messages each to the existing `/api/process` route (`handleProcess` → `processRecords`).
    - Inside each request, `processRecords` makes ten provider calls (at most two concurrently) via `processOne`.
    - This exercises exactly the product's validation, safety checks and limits.
  - **(B) A separately documented evaluation harness** that calls the provider directly. Its configuration must be documented and shown to match the product (prompt version, parameters, output schema, safety checks) before use.

  Note: "three batch requests" (A) and "30 individual `processOne` invocations" are different execution paths. Under (A), the 30 `processOne` calls happen *inside* the three requests. Under (B), the harness must state which functions it invokes. The run record names the path used. Every raw outcome is stored, including failures.
- **No retries are counted as first-pass results.** Any manual recovery retry is reported separately.
- Expected cost, from the Day 2 average of ~1,450 input and ~230 output tokens per call: about 30 × (1,450 × $0.10 + 230 × $0.50)/M ≈ **$0.008**. The price must be re-verified before the run.

## Outcome classes (reported separately, never merged)
- `completed`
- `failed` (by failure code)
- `truncated`
- `schema_invalid`
- `unassessable`

**Denominators:** every metric states its own. "Attempted" = 30. Quality metrics use completed outputs only, and the excluded count is listed.

## Metrics

| Metric | Definition |
|---|---|
| Primary accuracy (strict) | predicted primary = frozen primary, over completed |
| Primary accuracy (lenient) | predicted ∈ {primary} ∪ acceptable alternatives; reported next to strict, never instead of it |
| Per-intent accuracy | Per-intent confusion matrix (6×6), plus the Other / unclear row |
| Secondary precision / recall | Micro-averaged over (message, intent) pairs; also the multi-intent subset (n = 12) |
| Multi-intent handling | Share of the 12 multi-intent messages where the primary is correct **and** at least one expected secondary is present |
| Attention recall / precision | Positive = the frozen label has ≥1 attention reason; predicted = the model gave reasons, **or** a server flag fired. Model-only and server-only are reported separately. |
| Other / unclear | Correct OU on the 5 OU items; false OU on the other 25 |
| Failure and truncation rates | Per code, over 30 attempted |
| Short-reply compliance | Drafts under 120 words, over completed; plus min / median / max |
| Unsupported decision / privacy findings | Count of drafts blocked by the detector; drafts with withdrawal or injection flags; **plus manual reading of every draft** for unsupported claims or third-party data the detector misses (residual risks KL-1..3, R-WD, R-PII) |
| Latency, tokens, cost | Per-call latency min / median / max; total input and output tokens; estimated cost with a dated price source |

## Model output vs human-corrected results
- **Model metrics are computed on raw first-pass model outputs only.**
- Human corrections made in the UI afterwards (intent changes, edited drafts) are a **separate** dataset, describing product outcomes. They must never be used to raise model scores.

## Comparison
A baseline-vs-model table on identical messages and labels, with denominators. Differences on 30 items are descriptive; no statistical significance is claimed.

## Out of scope
- Prompt tuning on this dataset. If the prompt changes later, a new held-out set is needed.
- Reusing the exploratory 30 (E001–E030) as held-out data.
- WCAG claims.
