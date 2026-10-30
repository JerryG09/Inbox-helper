// EVAL-04C: Day 4 production-path evaluation adapter. Library only, no CLI: Phase A ships no runnable entry point.
// The model path is the product's own POST /api/process (handleProcess → processRecords → processOne); this module never
// builds a prompt and never calls a provider itself. A genuine run needs a separate owner execution authorization.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyBaseline } from "../../src/lib/classify/baseline";
import { INTENT_IDS } from "../../src/lib/domain/intents";
import { LiveRequestSchema, LiveResponseSchema, MAX_LIVE_MESSAGES, type LiveRequest } from "../../src/lib/processing/live-contract";

export const FROZEN_PATH = "eval/heldout/day4-candidate-messages-v1.0.json";
export const APPROVED_SHA256 = "646128933def19264ef6228bb944083de59e6e2bc4470ef077537d53b674d412";
export const EXPECTED_RECORDS = 30;
export const BATCH_SIZE = 10;
// The only form of execution authorization accepted for the approved dataset. Owners issue it per run; it is never stored.
export const authorizationPhrase = (sha: string) => `EVAL04C-AUTHORIZED-ONE-FIRST-PASS:${sha}`;

export type FrozenItem = {
  id: string; candidate_name: string; role_applied: string; subject: string; message: string;
  reference_label: { primary_intent: string; secondary_intents: string[]; needs_attention: boolean; attention_reasons: string[]; acceptable_alternative_primary: string[]; label_status: string };
};
export type FrozenDataset = { sha256: string; items: FrozenItem[] };

export const sha256 = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");

// Structural gate. `expectedCount` is 30 for the real set; fabricated fixtures may be smaller.
export function loadFrozen(raw: string, { expectedCount = EXPECTED_RECORDS }: { expectedCount?: number } = {}): FrozenDataset {
  const d = JSON.parse(raw) as { freeze_status?: string; label_status?: string; items?: FrozenItem[] };
  if (d.freeze_status !== "FROZEN") throw new Error("dataset is not FROZEN");
  if (d.label_status !== "owner_confirmed") throw new Error("dataset label_status is not owner_confirmed");
  const items = d.items ?? [];
  if (items.length !== expectedCount) throw new Error(`expected ${expectedCount} records, found ${items.length}`);
  if (new Set(items.map((i) => i.id)).size !== items.length) throw new Error("duplicate record ids");
  for (const i of items) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(i.id)) throw new Error(`invalid id ${i.id}`);
    if (i.reference_label?.label_status !== "owner_confirmed") throw new Error(`${i.id}: reference label is not owner_confirmed`);
    if (!(INTENT_IDS as readonly string[]).includes(i.reference_label.primary_intent)) throw new Error(`${i.id}: primary outside taxonomy`);
  }
  return { sha256: sha256(raw), items };
}

// Information isolation: fields are SELECTED, never spread, so reference labels and adjudication metadata cannot leak.
// role_applied is not part of the product request schema and is therefore not sent.
export function toRequestRecord(item: FrozenItem, batch: number, index: number): LiveRequest["records"][number] {
  return { key: `b${batch}:r${index + 1}`, importedId: item.id, candidateName: item.candidate_name, subject: item.subject, message: item.message };
}

export function partition(items: readonly FrozenItem[]): FrozenItem[][] {
  const out: FrozenItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) out.push(items.slice(i, i + BATCH_SIZE));
  if (BATCH_SIZE > MAX_LIVE_MESSAGES || out.some((b) => b.length > MAX_LIVE_MESSAGES)) throw new Error("batch exceeds the live 10-message ceiling");
  return out;
}

// Distinct terminal outcome kinds; nothing is collapsed into "wrong".
export type ItemOutcome =
  | { id: string; kind: "completed"; raw: unknown }
  | { id: string; kind: "provider_failure"; code: string; raw: unknown }
  | { id: string; kind: "unassessable"; code: "missing_outcome" | "duplicate_outcome" | "batch_http_error" | "batch_invalid_response" | "batch_exception"; detail: string }
  | { id: string; kind: "not_attempted"; reason: string };

export type PostBatch = (body: LiveRequest) => Promise<Response>;
export type Target =
  | { kind: "fake"; post: PostBatch }
  | { kind: "genuine"; post: PostBatch; url: string; authorization: string };

const LOOPBACK_URL = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\/api\/process$/;

// Refuses anything except: a fake target on non-approved (fabricated) data, or a genuine loopback target on the exact
// approved dataset with the exact per-run authorization phrase.
export function assertRunAllowed(ds: FrozenDataset, target: Target) {
  if (target.kind === "fake") {
    if (ds.sha256 === APPROVED_SHA256) throw new Error("REFUSED: the held-out dataset may not be processed in Phase A, even with a fake provider");
    return;
  }
  if (ds.sha256 !== APPROVED_SHA256) throw new Error("REFUSED: genuine runs require the approved frozen dataset hash");
  if (target.authorization !== authorizationPhrase(APPROVED_SHA256)) throw new Error("REFUSED: missing or wrong execution authorization");
  if (!LOOPBACK_URL.test(target.url)) throw new Error("REFUSED: genuine runs must target the loopback /api/process route");
}

export type RunRecord = {
  schema: "day4-eval-run-v1"; startedAt: string; finishedAt: string; target: "fake" | "genuine"; datasetSha256: string;
  httpRequests: number; batches: { batch: number; ids: string[]; httpStatus: number | null; latencyMs: number }[]; outcomes: ItemOutcome[];
};

// Run-time controls. `beforeBatch` may veto a batch (e.g. budget ceiling); every item of a vetoed batch and of all later
// batches is recorded as not_attempted. `afterBatch` persists each batch as soon as it settles.
export type RunHooks = {
  beforeBatch?: (batch: number, sofar: RunRecord) => string | null; // non-null = stop reason
  afterBatch?: (batch: number, sofar: RunRecord) => void;
};

// Exactly one first-pass attempt per item: one POST per batch, strictly sequential, no retry on any failure.
export async function runFirstPass(ds: FrozenDataset, target: Target, now = () => new Date(), hooks: RunHooks = {}): Promise<RunRecord> {
  assertRunAllowed(ds, target);
  const startedAt = now().toISOString();
  const batches: RunRecord["batches"] = [];
  const outcomes: ItemOutcome[] = [];
  let httpRequests = 0;
  const snapshot = (): RunRecord => ({ schema: "day4-eval-run-v1", startedAt, finishedAt: now().toISOString(), target: target.kind, datasetSha256: ds.sha256, httpRequests, batches: [...batches], outcomes: [...outcomes] });
  let stopped: string | null = null;
  for (const [b, items] of partition(ds.items).entries()) {
    stopped ??= hooks.beforeBatch?.(b + 1, snapshot()) ?? null;
    if (stopped) { items.forEach((i) => outcomes.push({ id: i.id, kind: "not_attempted", reason: stopped! })); continue; }
    const records = items.map((it, i) => toRequestRecord(it, b + 1, i));
    const body = LiveRequestSchema.parse({ records });
    const ids = items.map((i) => i.id);
    const t0 = Date.now();
    const unassessable = (code: Extract<ItemOutcome, { kind: "unassessable" }>["code"], detail: string) =>
      ids.forEach((id) => outcomes.push({ id, kind: "unassessable", code, detail }));
    let res: Response;
    try {
      httpRequests++;
      res = await target.post(body);
    } catch (e) {
      batches.push({ batch: b + 1, ids, httpStatus: null, latencyMs: Date.now() - t0 });
      unassessable("batch_exception", e instanceof Error ? e.name : "error");
      hooks.afterBatch?.(b + 1, snapshot());
      continue;
    }
    batches.push({ batch: b + 1, ids, httpStatus: res.status, latencyMs: Date.now() - t0 });
    if (!res.ok) { unassessable("batch_http_error", `HTTP ${res.status}`); hooks.afterBatch?.(b + 1, snapshot()); continue; }
    const parsed = LiveResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) { unassessable("batch_invalid_response", "response failed the live contract"); hooks.afterBatch?.(b + 1, snapshot()); continue; }
    const byKey = new Map<string, unknown[]>();
    for (const o of parsed.data.outcomes) byKey.set(o.key, [...(byKey.get(o.key) ?? []), o]);
    records.forEach((r) => {
      const mine = byKey.get(r.key) ?? [];
      if (mine.length === 0) outcomes.push({ id: r.importedId, kind: "unassessable", code: "missing_outcome", detail: "no outcome for key" });
      else if (mine.length > 1) outcomes.push({ id: r.importedId, kind: "unassessable", code: "duplicate_outcome", detail: `${mine.length} outcomes for key` });
      else {
        const o = mine[0] as { ok: boolean; code?: string };
        outcomes.push(o.ok ? { id: r.importedId, kind: "completed", raw: o } : { id: r.importedId, kind: "provider_failure", code: o.code ?? "unknown", raw: o });
      }
    });
    hooks.afterBatch?.(b + 1, snapshot());
  }
  return snapshot();
}

// Deterministic baseline adapter: same selected input fields as the model path; no reference label is read.
// Scoring the approved dataset needs the same authorization as a genuine run.
export function baselineFirstPass(ds: FrozenDataset, authorization?: string) {
  if (ds.sha256 === APPROVED_SHA256 && authorization !== authorizationPhrase(APPROVED_SHA256)) throw new Error("REFUSED: baseline on the held-out dataset needs authorization");
  return ds.items.map((it) => {
    const r = toRequestRecord(it, 1, 0);
    return { id: it.id, output: classifyBaseline({ candidate_name: r.candidateName, subject: r.subject, message: r.message }) };
  });
}

// Immutable run record: new file only (flag wx), never inside eval/heldout, never overwriting.
export function writeRunRecord(dir: string, run: RunRecord | { schema: string; startedAt: string }): string {
  if (path.resolve(dir).startsWith(path.resolve("eval/heldout"))) throw new Error("REFUSED: run output may not be written into the reference-label directory");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${run.startedAt.replace(/[:.]/g, "-")}-${(run as RunRecord).target ?? "baseline"}.json`);
  if (existsSync(file)) throw new Error(`REFUSED: ${file} already exists`);
  writeFileSync(file, JSON.stringify(run, null, 2) + "\n", { flag: "wx" });
  return file;
}
