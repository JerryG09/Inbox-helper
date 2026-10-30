// EVAL-04C one-shot runner (owner-authorized first pass). Not wired to an npm script on purpose.
//   npx tsx eval/day4/run-first-pass.ts baseline --authorization <phrase> --out <dir>
//   npx tsx eval/day4/run-first-pass.ts genuine  --authorization <phrase> --out <dir> --url http://127.0.0.1:3000/api/process
//   npx tsx eval/day4/run-first-pass.ts fake --dataset <fabricated.json> --count <n> --out <dir> --url <loopback fake-upstream route>
// The genuine mode posts to the running product route; this script holds no API key and never calls a provider itself.
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FROZEN_PATH, baselineFirstPass, loadFrozen, runFirstPass, type RunRecord } from "./harness";
import { PRICE, draftStats, ops, predFromOutcome, score, type Pred } from "./score";

const { positionals, values } = parseArgs({ allowPositionals: true, options: {
  authorization: { type: "string" }, out: { type: "string" }, url: { type: "string" }, dataset: { type: "string" }, count: { type: "string" },
} });
const mode = positionals[0];
if (!["baseline", "genuine", "fake"].includes(mode ?? "") || !values.out) throw new Error("usage: run-first-pass.ts baseline|genuine|fake --out <dir> ...");
const OUT = values.out;
const datasetPath = mode === "fake" ? values.dataset! : FROZEN_PATH;
const ds = loadFrozen(readFileSync(datasetPath, "utf8"), mode === "fake" ? { expectedCount: Number(values.count) } : {});
mkdirSync(OUT, { recursive: true });
const write = (name: string, v: unknown) => { const f = path.join(OUT, name); writeFileSync(f, JSON.stringify(v, null, 2) + "\n", { flag: "wx" }); return f; };
const gitSha = execSync("git rev-parse HEAD").toString().trim();
const gitDirty = execSync("git status --porcelain").toString().trim().split("\n").filter(Boolean);

// Worst case for one more batch: 10 calls × (2,200 input + 1,600 output tokens) at the verified Haiku 5.5 price.
export const CEILING_USD = 0.05;
const WORST_BATCH_USD = (10 * (2200 * PRICE.inputPerMTok + 1600 * PRICE.outputPerMTok)) / 1e6;
const EXPECTED_MODEL = /^claude-haiku-5-5/;

async function main() {
  const startedAt = new Date().toISOString();
  const manifestBase = { mode, startedAt, gitSha, gitUncommitted: gitDirty, dataset: datasetPath, datasetSha256: ds.sha256, scoringVersion: "day4-protocol-v1" };

  if (mode === "baseline") {
    const preds = baselineFirstPass(ds, values.authorization);
    const map = new Map<string, Pred | null>(preds.map((p) => [p.id, { primary: p.output.primary_intent, secondary: p.output.secondary_intents, attention: p.output.needs_attention, reasons: p.output.attention_reasons }]));
    write("baseline-predictions.json", { ...manifestBase, implementation: "src/lib/classify/baseline.ts (unchanged)", finishedAt: new Date().toISOString(), predictions: preds });
    write("baseline-scores.json", { ...manifestBase, scores: score(ds.items, map) });
    console.log("baseline written");
    return;
  }

  const jsonl = path.join(OUT, `${mode}-batches.jsonl`);
  if (existsSync(jsonl)) throw new Error(`REFUSED: ${jsonl} exists (no second pass)`);
  let lastPersisted = 0;
  const post = async (body: unknown) => fetch(values.url!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const run: RunRecord = await runFirstPass(ds, mode === "genuine" ? { kind: "genuine", post, url: values.url!, authorization: values.authorization ?? "" } : { kind: "fake", post }, undefined, {
    beforeBatch: (b, sofar) => {
      const o = ops(sofar.outcomes);
      if (o.estimatedCostUsd + WORST_BATCH_USD > CEILING_USD) return `budget: spent ${o.estimatedCostUsd} + worst batch ${WORST_BATCH_USD} > ${CEILING_USD}`;
      if (mode === "genuine" && o.models.some((m) => m !== null && !EXPECTED_MODEL.test(m))) return `unexpected model ${o.models.join(",")}`;
      if (o.failuresByCode.provider_auth) return "provider_auth failure";
      if ((o.failuresByCode.provider_rate_limited?.length ?? 0) + (o.failuresByCode.provider_overloaded?.length ?? 0) >= 3) return "repeated rate limiting / overload";
      if (sofar.batches.some((x) => x.httpStatus !== 200)) return "a previous batch did not return HTTP 200";
      console.log(`batch ${b}: proceeding (spent so far $${o.estimatedCostUsd})`);
      return null;
    },
    afterBatch: (b, sofar) => {
      appendFileSync(jsonl, JSON.stringify({ batch: b, at: new Date().toISOString(), batchInfo: sofar.batches.at(-1), outcomes: sofar.outcomes.slice(lastPersisted) }) + "\n");
      lastPersisted = sofar.outcomes.length;
    },
  });
  const map = new Map(run.outcomes.map((o) => [o.id, predFromOutcome(o)]));
  write(`${mode}-run-record.json`, { ...manifestBase, run });
  write(`${mode}-scores.json`, { ...manifestBase, scores: score(ds.items, map), drafts: draftStats(ds.items, map), operations: ops(run.outcomes), price: PRICE, ceilingUsd: CEILING_USD });
  console.log(JSON.stringify({ httpRequests: run.httpRequests, kinds: ops(run.outcomes).byKind, cost: ops(run.outcomes).estimatedCostUsd }));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
