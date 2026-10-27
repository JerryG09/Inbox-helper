// Evaluation runner. Usage:
//   npm run eval:baseline                       deterministic keyword baseline (no network)
//   npm run eval:llm                            genuine Anthropic Messages API call per item
//   npm run eval:llm -- --ids E017,E028 --max-tokens 800 --tag recovery
//                                               bounded subset run, saved as a separate file
// Options: --dataset <path> (default eval/dataset/v0.1.json), --ids, --max-tokens (default 400), --tag.
// The LLM run reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from the process env or the git-ignored .env.local.
// It never runs in the browser and never logs the key.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { classifyBaseline } from "../src/lib/classify/baseline";
import { PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from "../src/lib/classify/prompt";
import { interpret } from "../src/lib/eval/interpret";
import { score, type EvalItem, type Prediction } from "../src/lib/eval/score";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { dataset: { type: "string" }, ids: { type: "string" }, "max-tokens": { type: "string" }, tag: { type: "string" } },
});
const mode = positionals[0];
if (mode !== "baseline" && mode !== "llm") throw new Error("usage: run.ts baseline|llm [--ids ..] [--max-tokens n] [--tag t] [--dataset p]");

const DATASET = values.dataset ?? "eval/dataset/v0.1.json";
const dataset = JSON.parse(readFileSync(DATASET, "utf8")) as { version: string; label_status: string; items: EvalItem[] };
const requestedIds = values.ids?.split(",").map((s) => s.trim()).filter(Boolean);
const items = requestedIds ? dataset.items.filter((i) => requestedIds.includes(i.id)) : dataset.items;
if (requestedIds && items.length !== requestedIds.length) throw new Error(`unknown id(s) in --ids: ${requestedIds.join(",")}`);

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}

// No `temperature`: the API rejects it as deprecated for current models (run 2026-10-27T09-27-22Z, 30/30 failures).
const PARAMS = { max_tokens: Number(values["max-tokens"] ?? 400) };
if (!Number.isInteger(PARAMS.max_tokens) || PARAMS.max_tokens < 1) throw new Error("--max-tokens must be a positive integer");

async function callAnthropic(model: string, key: string, item: EvalItem) {
  const started = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, ...PARAMS, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userPrompt(item) }] }),
  });
  const body = (await res.json()) as {
    id?: string; model?: string; stop_reason?: string;
    content?: { type: string; text?: string }[]; usage?: unknown; error?: { type: string; message: string };
  };
  const latencyMs = Date.now() - started;
  if (!res.ok) return { latencyMs, httpStatus: res.status, error: `${body.error?.type ?? "http_error"}: ${body.error?.message ?? res.statusText}` };
  const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("");
  return { latencyMs, httpStatus: res.status, responseId: body.id, responseModel: body.model, stopReason: body.stop_reason, usage: body.usage, text };
}

async function main() {
  const startedAt = new Date().toISOString();
  const predictions: Prediction[] = [];
  const records: unknown[] = [];
  let meta: Record<string, unknown>;

  if (mode === "baseline") {
    meta = { kind: "deterministic_keyword_baseline", genuineLLM: false };
    for (const item of items) predictions.push({ id: item.id, output: classifyBaseline(item) });
  } else {
    loadEnvLocal();
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      console.error("BLOCKED: ANTHROPIC_API_KEY is not set (env or .env.local). No LLM call was made and no results were produced.");
      process.exit(2);
    }
    const model = process.env.ANTHROPIC_MODEL || process.env.LLM_MODEL || "claude-sonnet-5-5";
    meta = { kind: "llm", genuineLLM: true, provider: "anthropic", model, promptVersion: PROMPT_VERSION, params: PARAMS, systemPrompt: SYSTEM_PROMPT };
    for (const item of items) {
      const r = await callAnthropic(model, key, item);
      const { validationIssues, ...prediction } = interpret({ id: item.id, ...r });
      predictions.push(prediction);
      records.push({ id: item.id, ...r, parsed: prediction.output, error: prediction.error, errorKind: prediction.errorKind, validationIssues });
      console.log(`${item.id} ${prediction.error ? "FAIL " + prediction.error : prediction.output!.primary_intent} (${r.latencyMs} ms, stop=${r.stopReason ?? "-"})`);
    }
  }

  const result = score(items, predictions);
  const run = {
    startedAt, finishedAt: new Date().toISOString(), tag: values.tag ?? null, subset: requestedIds ?? null,
    dataset: DATASET, datasetVersion: dataset.version, labelStatus: dataset.label_status, inputIds: items.map((i) => i.id), ...meta,
    predictions, records, scoringVersion: result.scoringVersion, score: { overall: result.overall, byCategory: result.byCategory }, rows: result.rows,
  };
  mkdirSync("eval/runs", { recursive: true });
  const suffix = [mode, values.tag].filter(Boolean).join("-");
  const file = path.join("eval/runs", `${startedAt.replace(/[:.]/g, "-")}-${suffix}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2) + "\n", { flag: "wx" }); // never overwrite an existing run
  console.log(JSON.stringify(run.score.overall, null, 2));
  console.log(`Written ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
