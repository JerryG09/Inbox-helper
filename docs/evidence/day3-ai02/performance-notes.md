# AI-02E — Genuine-provider performance and cost notes (descriptive only)

**Provenance:** every number below is a **genuine Anthropic** observation reused from committed Day 2 evidence. This Day 3 slice made **zero** provider calls and spent **zero** paid tokens. Fake-provider latencies and token counts from tests are deliberately excluded.

**Sources:**
- `docs/evidence/ai-01/live-call-metadata.jsonl` — 4 calls. Accepted in AI-01 `7db4b44`, merged to main.
- `docs/evidence/day2-closeout/live-call-metadata.jsonl` — 1 call. Accepted in `6a23fe2`.

Prompt version `live-v1` (`src/lib/processing/provider.ts` `PROMPT_VERSION`), structured JSON output, thinking disabled, `max_tokens` 1,600.

| # | Scenario | Response id | Request id | Model (returned) | Input tok | Output tok | Latency ms | Stop |
|---|---|---|---|---|---|---|---|---|
| 1 | AI-01 b1:r2 | msg_011CgUQJje9jVuVoYpGTyadM | req_011CgUQJijL92ADp5gToejDH | claude-haiku-5-5 | 1,452 | 180 | 3,255 | end_turn |
| 2 | AI-01 b1:r3 | msg_011CgUQJjfe4geUaC9zhhzLg | req_011CgUQJijanJfjMCK7us1sp | claude-haiku-5-5 | 1,446 | 255 | 4,042 | end_turn |
| 3 | AI-01 b1:r4 (prompt injection) | msg_011CgUQJwKNTrwuJBfk5UuKV | req_011CgUQJvy3JhRDkF1VTsCu1 | claude-haiku-5-5 | 1,439 | 266 | 3,737 | end_turn |
| 4 | AI-01 b1:r5 | msg_011CgUQJzi1nbKpu6zufHquc | req_011CgUQJzKTJ3E9VVhYwm6XN | claude-haiku-5-5 | 1,443 | 184 | 4,120 | end_turn |
| 5 | Day 2 Scenario E (withdrawal), 2026-10-28T14:02:02Z (capture time) | msg_011CgUkvugjPdNAKuELCz3Wj | req_011CgUkvta1FNsq3Jcuszzb4 | claude-haiku-5-5 | 1,476 | 266 | 3,288 | end_turn |

**Summary (n = 5):**
- 5 of 5 calls completed with `end_turn`.
- Total tokens: 7,256 input and 1,151 output.
- Latency: min 3,255 ms, median 3,737 ms, mean 3,688 ms, max 4,120 ms.
- Latency is measured by the server per call. It includes network time from this developer machine and excludes browser time.
- The AI-01 server log carried no timestamps. Its calls ran in one batch with at most 2 in flight.

**Estimated cost:** about **$0.0013**. Arithmetic: 7,256 × $0.10/M + 1,151 × $0.50/M.
- The pricing basis is the Claude Haiku 5.5 rate recorded in `docs/evidence/ai-01/README.md`, from the Anthropic price list as cached on 2026-10-06.
- **The price was not re-verified against a live source in this slice.** This is an estimate, not a provider bill. No invoice or usage console was consulted.

**Limitations:**
- Five calls from one machine on one day are an anecdote, not a benchmark. No percentiles, throughput or tail-latency claims are made.
- No rate-limit, overload or timeout behaviour was observed from the genuine provider. Those paths are qualified only with fakes (see `qualification-matrix.md`).
- Day 4 must measure latency, usage and cost on its held-out evaluation run, with the run configuration recorded.
