// Evaluation runner. Usage:
//   npm run eval:baseline           deterministic keyword baseline (no network)
//   npm run eval:llm                genuine Anthropic Messages API call per item
// The LLM run reads ANTHROPIC_API_KEY (and optional LLM_MODEL) from the process env or the git-ignored .env.local.
// It never runs in the browser and never logs the key.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyBaseline } from "../src/lib/classify/baseline";
import { PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from "../src/lib/classify/prompt";
import { ClassificationSchema } from "../src/lib/domain/intents";
import { score, type EvalItem, type Prediction } from "../src/lib/eval/score";

const DATASET = "eval/dataset/v0.1.json";
const mode = process.argv[2];
if (mode !== "baseline" && mode !== "llm") throw new Error("usage: run.ts baseline|llm");

const dataset = JSON.parse(readFileSync(DATASET, "utf8")) as { version: string; label_status: string; items: EvalItem[] };
const items = dataset.items;

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}

const PARAMS = { max_tokens: 400, temperature: 0 };

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
    const model = process.env.LLM_MODEL ?? "claude-sonnet-5-5";
    meta = { kind: "llm", genuineLLM: true, provider: "anthropic", model, promptVersion: PROMPT_VERSION, params: PARAMS, systemPrompt: SYSTEM_PROMPT };
    for (const item of items) {
      const r = await callAnthropic(model, key, item);
      let output = null;
      let error = r.error;
      let validationIssues: unknown;
      if (!error) {
        try {
          const parsed = ClassificationSchema.safeParse(JSON.parse(r.text ?? ""));
          if (parsed.success) output = parsed.data;
          else { error = "schema_validation_failed"; validationIssues = parsed.error.issues; }
        } catch {
          error = "invalid_json";
        }
      }
      predictions.push({ id: item.id, output, error });
      records.push({ id: item.id, ...r, parsed: output, error, validationIssues });
      console.log(`${item.id} ${error ? "FAIL " + error : output!.primary_intent} (${r.latencyMs} ms)`);
    }
  }

  const result = score(items, predictions);
  const run = {
    startedAt, finishedAt: new Date().toISOString(), dataset: DATASET, datasetVersion: dataset.version,
    labelStatus: dataset.label_status, inputIds: items.map((i) => i.id), ...meta,
    predictions, records, score: { overall: result.overall, byCategory: result.byCategory }, rows: result.rows,
  };
  mkdirSync("eval/runs", { recursive: true });
  const file = path.join("eval/runs", `${startedAt.replace(/[:.]/g, "-")}-${mode}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2) + "\n");
  console.log(JSON.stringify(run.score, null, 2));
  console.log(`Written ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
