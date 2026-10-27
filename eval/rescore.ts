// Re-score existing run files with the current scoring version WITHOUT modifying them.
//   npm run eval:rescore -- <run.json> [--dataset eval/dataset/v0.1.json]
// Output: eval/rescored/<run basename>.scoring-<version>.<dataset version>.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { interpret, type CallRecord } from "../src/lib/eval/interpret";
import { score, type EvalItem, type Prediction } from "../src/lib/eval/score";

const { positionals, values } = parseArgs({ allowPositionals: true, options: { dataset: { type: "string" } } });
const runFile = positionals[0];
if (!runFile) throw new Error("usage: rescore.ts <run.json> [--dataset path]");

const datasetPath = values.dataset ?? "eval/dataset/v0.1.json";
const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as { version: string; label_status: string; items: EvalItem[] };
const run = JSON.parse(readFileSync(runFile, "utf8")) as { kind: string; inputIds: string[]; records: CallRecord[]; predictions: Prediction[] };

const items = dataset.items.filter((i) => run.inputIds.includes(i.id));
// LLM runs are re-interpreted from raw call records; the baseline has no records and its predictions are reused.
const predictions = run.kind === "llm" ? run.records.map((r) => { const p = interpret(r); delete p.validationIssues; return p; }) : run.predictions;
const result = score(items, predictions);

const out = {
  sourceRun: runFile,
  sourceRunUnmodified: true,
  dataset: datasetPath,
  datasetVersion: dataset.version,
  labelStatus: dataset.label_status,
  scoringVersion: result.scoringVersion,
  score: { overall: result.overall, byCategory: result.byCategory },
  rows: result.rows,
};
mkdirSync("eval/rescored", { recursive: true });
const file = path.join("eval/rescored", `${path.basename(runFile, ".json")}.scoring-${result.scoringVersion}.dataset-${dataset.version}.json`);
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ file, overall: result.overall }, null, 2));
