// EVAL-04C offline contract tests for eval/day4/harness.ts. Fabricated fixtures only (F001..), never the held-out
// messages; the provider is a fake `create` injected into the real handleProcess pipeline. Proves wiring and safety
// boundaries only — it says nothing about Haiku's classification quality.
import type Anthropic from "@anthropic-ai/sdk";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleProcess } from "@/lib/processing/handler";
import type { CreateMessage } from "@/lib/processing/provider";
import {
  APPROVED_SHA256, BATCH_SIZE, assertRunAllowed, authorizationPhrase, baselineFirstPass, loadFrozen, partition, runFirstPass,
  toRequestRecord, writeRunRecord, type FrozenDataset, type PostBatch,
} from "../../eval/day4/harness";

// Mutable view of a fixture, for the negative cases only.
type Fx = { freeze_status: string; label_status: string; items: { id: string; reference_label: { label_status: string; primary_intent: string } }[] };
const LEAK = "LEAK-SENTINEL-REFERENCE-LABEL";
const fixture = (n: number) => JSON.stringify({
  dataset: "fabricated-fixture", version: "test", freeze_status: "FROZEN", label_status: "owner_confirmed",
  label_provenance: { description: `${LEAK} provenance` },
  items: Array.from({ length: n }, (_, i) => ({
    id: `F${String(i + 1).padStart(3, "0")}`, candidate_name: `Fixture Person ${i + 1}`, role_applied: `${LEAK} role`,
    subject: `Fixture subject ${i + 1}`, message: `Fabricated fixture message number ${i + 1}. Is the role remote?`,
    reference_label: { primary_intent: "job_information", secondary_intents: [], needs_attention: true, attention_reasons: [`${LEAK} reason`], acceptable_alternative_primary: ["other_unclear"], label_status: "owner_confirmed" },
  })),
}, null, 2);

const good = { primary_intent: "job_information", secondary_intents: [], summary: "Asks about remote work.", draft_reply: "Hi, the team will follow up.", attention_reasons: [], unsupported_hiring_decision: false };
function fakeProvider(fail: (p: Anthropic.MessageCreateParamsNonStreaming) => boolean = () => false) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  let inFlight = 0, maxInFlight = 0;
  const create: CreateMessage = async (p) => {
    calls.push(p); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight--;
    if (fail(p)) throw new Error("boom");
    return { message: { id: `msg_${calls.length}`, model: p.model, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(good) }], usage: { input_tokens: 10, output_tokens: 20 } } as unknown as Anthropic.Message, requestId: "req" };
  };
  return { calls, create, maxInFlight: () => maxInFlight };
}
// The real product route handler, reached over an in-process Request (loopback host, same origin).
const viaHandler = (create: CreateMessage, posts: { records: unknown[] }[] = []): PostBatch => async (body) => {
  posts.push(body);
  return handleProcess(new Request("http://127.0.0.1:3000/api/process", {
    method: "POST", body: JSON.stringify(body),
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" },
  }), create);
};

beforeEach(() => {
  vi.stubEnv("INBOX_PROCESSING_MODE", "anthropic");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-NOT-A-REAL-KEY-day4");
  vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-5-5");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("dataset gate", () => {
  it("accepts a FROZEN, owner_confirmed set and records its hash", () => {
    const ds = loadFrozen(fixture(30));
    expect(ds.items).toHaveLength(30);
    expect(ds.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(ds.sha256).not.toBe(APPROVED_SHA256);
  });
  it.each([
    ["not frozen", (d: Fx) => { d.freeze_status = "NOT_FROZEN"; }],
    ["unconfirmed top-level labels", (d: Fx) => { d.label_status = "AI_PROPOSED_UNVERIFIED"; }],
    ["one unconfirmed item label", (d: Fx) => { d.items[4]!.reference_label.label_status = "AI_PROPOSED_UNVERIFIED"; }],
    ["wrong count", (d: Fx) => { d.items.pop(); }],
    ["duplicate id", (d: Fx) => { d.items[1]!.id = d.items[0]!.id; }],
    ["primary outside taxonomy", (d: Fx) => { d.items[0]!.reference_label.primary_intent = "hired"; }],
  ])("rejects %s", (_, mutate) => {
    const d = JSON.parse(fixture(30)); mutate(d);
    expect(() => loadFrozen(JSON.stringify(d))).toThrow();
  });
});

describe("information isolation and ids", () => {
  it("request records carry only selected candidate fields with stable ids; no label value is present", () => {
    const ds = loadFrozen(fixture(30));
    const r = toRequestRecord(ds.items[12]!, 2, 2);
    expect(r).toEqual({ key: "b2:r3", importedId: "F013", candidateName: "Fixture Person 13", subject: "Fixture subject 13", message: ds.items[12]!.message });
    expect(JSON.stringify(r)).not.toContain(LEAK);
  });
  it("no reference label, alternative, attention truth or provenance reaches the provider prompt", async () => {
    const f = fakeProvider();
    await runFirstPass(loadFrozen(fixture(30)), { kind: "fake", post: viaHandler(f.create) });
    expect(f.calls).toHaveLength(30);
    for (const c of f.calls) expect(JSON.stringify(c)).not.toMatch(/LEAK-SENTINEL|reference_label|acceptable_alternative|needs_attention|owner_confirmed/);
  });
});

describe("batching and attempt accounting", () => {
  it("30 items → 3 sequential HTTP batches of 10, exactly one provider attempt each, ≤ 2 concurrent", async () => {
    const f = fakeProvider(); const posts: { records: unknown[] }[] = [];
    const run = await runFirstPass(loadFrozen(fixture(30)), { kind: "fake", post: viaHandler(f.create, posts) });
    expect(posts.map((p) => p.records.length)).toEqual([10, 10, 10]);
    expect(run.httpRequests).toBe(3);
    expect(f.calls).toHaveLength(30);
    expect(f.maxInFlight()).toBeLessThanOrEqual(2);
    expect(run.outcomes.map((o) => o.id)).toEqual(Array.from({ length: 30 }, (_, i) => `F${String(i + 1).padStart(3, "0")}`));
    expect(run.outcomes.every((o) => o.kind === "completed")).toBe(true);
  });
  it("hard 10-message ceiling per batch", () => {
    expect(BATCH_SIZE).toBe(10);
    expect(partition(loadFrozen(fixture(25), { expectedCount: 25 }).items).map((b) => b.length)).toEqual([10, 10, 5]);
  });
  it("provider failures are recorded once with their code and never retried", async () => {
    const f = fakeProvider((p) => JSON.stringify(p).includes("number 7."));
    const run = await runFirstPass(loadFrozen(fixture(30)), { kind: "fake", post: viaHandler(f.create) });
    expect(f.calls).toHaveLength(30);
    expect(run.outcomes.find((o) => o.id === "F007")).toMatchObject({ kind: "provider_failure", code: "request_failed" });
    expect(run.outcomes.filter((o) => o.kind === "completed")).toHaveLength(29);
  });
  it("missing, duplicate, HTTP-error and thrown batches become distinct unassessable outcomes, without extra requests", async () => {
    const ds = loadFrozen(fixture(30)); let n = 0;
    const post: PostBatch = async (body) => {
      n++;
      if (n === 1) throw new Error("socket");
      if (n === 2) return Response.json({ error: "live_unavailable" }, { status: 503 });
      const o = (k: string) => ({ key: k, ok: false, source: "anthropic", code: "provider_timeout", description: "x" });
      const keys = body.records.map((r) => r.key);
      return Response.json({ mode: "anthropic", outcomes: [o(keys[0]!), o(keys[0]!), ...keys.slice(2).map(o)] }); // r2 missing, r1 duplicated
    };
    const run = await runFirstPass(ds, { kind: "fake", post });
    expect(n).toBe(3);
    const byId = Object.fromEntries(run.outcomes.map((o) => [o.id, o]));
    expect(byId.F001).toMatchObject({ kind: "unassessable", code: "batch_exception" });
    expect(byId.F011).toMatchObject({ kind: "unassessable", code: "batch_http_error" });
    expect(byId.F021).toMatchObject({ kind: "unassessable", code: "duplicate_outcome" });
    expect(byId.F022).toMatchObject({ kind: "unassessable", code: "missing_outcome" });
    expect(byId.F023).toMatchObject({ kind: "provider_failure", code: "provider_timeout" });
    expect(run.outcomes).toHaveLength(30);
  });
});

describe("execution authorization", () => {
  const approved = { sha256: APPROVED_SHA256, items: [] } as FrozenDataset;
  const noPost: PostBatch = async () => { throw new Error("must not be called"); };
  it("the approved held-out set is refused for fake processing and for baseline scoring in Phase A", () => {
    expect(() => assertRunAllowed(approved, { kind: "fake", post: noPost })).toThrow(/Phase A/);
    expect(() => baselineFirstPass(approved)).toThrow(/authorization/);
  });
  it("genuine runs need the approved hash, the exact phrase and a loopback route", () => {
    const g = (authorization: string, url = "http://127.0.0.1:3000/api/process") => ({ kind: "genuine" as const, post: noPost, url, authorization });
    expect(() => assertRunAllowed(approved, g(""))).toThrow(/authorization/);
    expect(() => assertRunAllowed(approved, g(authorizationPhrase("0".repeat(64))))).toThrow(/authorization/);
    expect(() => assertRunAllowed(approved, g(authorizationPhrase(APPROVED_SHA256), "https://inbox.example.com/api/process"))).toThrow(/loopback/);
    expect(() => assertRunAllowed(loadFrozen(fixture(30)), g(authorizationPhrase(APPROVED_SHA256)))).toThrow(/approved frozen dataset/);
    expect(() => assertRunAllowed(approved, g(authorizationPhrase(APPROVED_SHA256)))).not.toThrow();
  });
  it("a refused run makes no request", async () => {
    const f = fakeProvider();
    await expect(runFirstPass(approved, { kind: "fake", post: viaHandler(f.create) })).rejects.toThrow();
    expect(f.calls).toHaveLength(0);
  });
});

describe("baseline adapter and run records", () => {
  it("baseline sees the same selected input fields and no label", () => {
    const out = baselineFirstPass(loadFrozen(fixture(3), { expectedCount: 3 }));
    expect(out.map((o) => o.id)).toEqual(["F001", "F002", "F003"]);
    expect(out[0]!.output.primary_intent).toBe("job_information"); // "role"/"remote" keywords in the fabricated text
    expect(JSON.stringify(out)).not.toContain(LEAK);
  });
  it("run records are new files only, outside eval/heldout, never overwritten, and hold no reference labels", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "day4-run-"));
    const run = await runFirstPass(loadFrozen(fixture(30)), { kind: "fake", post: viaHandler(fakeProvider().create) }, () => new Date("2026-10-30T12:00:00Z"));
    const file = writeRunRecord(dir, run);
    expect(() => writeRunRecord(dir, run)).toThrow(/exists/);
    expect(() => writeRunRecord("eval/heldout/runs", run)).toThrow(/reference-label/);
    expect(readdirSync(dir)).toHaveLength(1);
    expect(readFileSync(file, "utf8")).not.toMatch(/LEAK-SENTINEL|reference_label/);
  });
});

describe("run-time controls (EVAL-04C)", () => {
  it("afterBatch persists every batch as it settles; beforeBatch veto stops all later batches as not_attempted", async () => {
    const f = fakeProvider(); const persisted: number[] = [];
    const run = await runFirstPass(loadFrozen(fixture(30)), { kind: "fake", post: viaHandler(f.create) }, undefined, {
      beforeBatch: (b) => (b === 2 ? "budget ceiling" : null),
      afterBatch: (_, sofar) => persisted.push(sofar.outcomes.length),
    });
    expect(f.calls).toHaveLength(10);
    expect(run.httpRequests).toBe(1);
    expect(persisted).toEqual([10]);
    expect(run.outcomes.slice(10).every((o) => o.kind === "not_attempted")).toBe(true);
    expect(run.outcomes).toHaveLength(30);
  });
});
