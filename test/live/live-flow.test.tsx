// AI-01 carry-forwards B and C through the real browser adapter (liveBatch) and the UI-05A state machine, with a
// controlled fake fetch: delayed success/failure, timeout, rate limit, schema-invalid and truncated responses, reset,
// re-import, stale completion, repeated retry, partial success, preservation of human work, and simulation-hook isolation.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InboxApp } from "@/components/InboxApp";
import { approveDraft, editDraft, updateRecord } from "@/lib/domain/transitions";
import type { RawRow, ValidMessage } from "@/lib/domain/types";
import { applyImport, beginProcessing, failOperation, initialImportState, resetState, settleOperation, startOperation, type ImportState } from "@/lib/import/state";
import { SAMPLE_ROWS } from "@/lib/import/sample";
import { liveBatch } from "@/lib/processing/live-client";
import { FAILURES, type LiveOutcome } from "@/lib/processing/live-contract";
import type { ProcessBatch } from "@/lib/processing/processor";

const meta = { provider: "anthropic", model: "claude-haiku-5-5", responseId: "msg_x", requestId: "req_x", inputTokens: 10, outputTokens: 20, latencyMs: 5, stopReason: "end_turn", code: "ok" } as const;
const okOutcome = (key: string, draft = `Genuine draft for ${key}`): LiveOutcome => ({
  key, ok: true, source: "anthropic", primaryIntent: "job_information", secondaryIntents: [], summary: "Asks about the role.", draft, attentionReasons: [], blocked: false, meta,
});
const failOutcome = (key: string, code: keyof typeof FAILURES): LiveOutcome => ({ key, ok: false, source: "anthropic", code, description: FAILURES[code], meta: { ...meta, code } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Handler = (keys: string[]) => Promise<Response> | Response;
function fakeFetch(handler: Handler) {
  const calls: string[][] = [];
  const f = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const keys = (JSON.parse(String(init!.body)) as { records: { key: string }[] }).records.map((r) => r.key);
    calls.push(keys);
    return new Promise<Response>((resolve, reject) => {
      init!.signal?.addEventListener("abort", () => reject(init!.signal!.reason));
      Promise.resolve(handler(keys)).then(resolve, reject);
    });
  }) as typeof fetch;
  return { f, calls };
}

const rows = (n: number): RawRow[] => Array.from({ length: n }, (_, i) => ({ id: `L${i + 1}`, candidate_name: `Live Person ${i + 1}`, subject: "Role", message: `Is role ${i + 1} remote?` }));
const queued = (n = 3, from: ImportState = initialImportState) => beginProcessing(applyImport(from, rows(n), "live.csv"));
const keysOf = (s: ImportState, st?: string) => s.records.filter((r) => !st || r.processing === st).map((r) => r.key);

// The page's runOperation() pattern, split so tests can mutate state while the adapter is pending.
function begin(s: ImportState, kind: "batch" | "retry", keys: readonly string[], adapter: ProcessBatch) {
  const { state, op } = startOperation(s, kind, keys, true);
  if (!op) return { state, op, settle: null };
  const msgs: ValidMessage[] = state.valid.filter((m) => op.keys.includes(m.key));
  const pending = adapter(msgs).then((o) => (cur: ImportState) => settleOperation(cur, op.id, o), () => (cur: ImportState) => failOperation(cur, op.id));
  return { state, op, settle: pending };
}

describe("live adapter outcomes through the state machine", () => {
  it("delayed success settles every target Completed/Pending with genuine provenance", async () => {
    const { f } = fakeFetch(async (keys) => { await sleep(40); return json({ mode: "anthropic", outcomes: keys.map((k) => okOutcome(k)) }); });
    const b = begin(queued(), "batch", keysOf(queued()), liveBatch(f));
    expect(b.state.records.every((r) => r.processing === "processing")).toBe(true);
    const s = (await b.settle!)(b.state);
    expect(s.records.every((r) => r.processing === "completed" && r.review === "pending" && r.outcomeSource === "anthropic")).toBe(true);
    expect(s.records[0]!.providerMeta).toMatchObject({ model: "claude-haiku-5-5", responseId: "msg_x" });
  });

  const wholeRequestFailures: [string, Handler, string][] = [
    ["delayed provider-unavailable (503)", async () => { await sleep(30); return json({ error: "live_unavailable" }, 503); }, "live_unavailable"],
    ["rate limit (per record)", async (keys) => json({ mode: "anthropic", outcomes: keys.map((k) => failOutcome(k, "provider_rate_limited")) }), "provider_rate_limited"],
    ["schema-invalid (per record)", async (keys) => json({ mode: "anthropic", outcomes: keys.map((k) => failOutcome(k, "provider_schema_invalid")) }), "provider_schema_invalid"],
    ["truncated (per record)", async (keys) => json({ mode: "anthropic", outcomes: keys.map((k) => failOutcome(k, "provider_truncated")) }), "provider_truncated"],
    ["delayed network rejection", async () => { await sleep(30); throw new TypeError("Failed to fetch"); }, "request_failed"],
    ["malformed server body", async () => new Response("<html>oops", { status: 200 }), "request_failed"],
    ["response claiming simulated provenance", async (keys) => json({ mode: "anthropic", outcomes: keys.map((k) => ({ ...okOutcome(k), source: "simulated_fixture" })) }), "request_failed"],
  ];
  for (const [name, handler, code] of wholeRequestFailures) {
    it(`${name} → every target Failed (${code}), retry available, no fake completion`, async () => {
      const q = queued();
      const b = begin(q, "batch", keysOf(q), liveBatch(fakeFetch(handler).f));
      const s = (await b.settle!)(b.state);
      expect(s.records.every((r) => r.processing === "failed" && r.error?.code === code && !r.currentDraft)).toBe(true);
      expect(s.activeOp).toBeNull();
    });
  }

  it("client timeout aborts the request and settles every target Failed (request_timeout)", async () => {
    const { f } = fakeFetch(() => new Promise(() => {}));
    const q = queued(2);
    const b = begin(q, "batch", keysOf(q), liveBatch(f, 50));
    const s = (await b.settle!)(b.state);
    expect(s.records.map((r) => r.error?.code)).toEqual(["request_timeout", "request_timeout"]);
  });

  it("11 records are refused in the browser without any request", async () => {
    const { f, calls } = fakeFetch(() => json({}));
    const q = queued(11);
    const b = begin(q, "batch", keysOf(q), liveBatch(f));
    const s = (await b.settle!)(b.state);
    expect(calls).toHaveLength(0);
    expect(s.records.every((r) => r.error?.code === "live_batch_limit")).toBe(true);
  });

  it("partial success in a multi-record batch; missing outcome becomes an explicit live failure", async () => {
    const { f } = fakeFetch((k) => json({ mode: "anthropic", outcomes: [okOutcome(k[0]!), failOutcome(k[1]!, "provider_timeout")] }));
    const q = queued(3);
    const b = begin(q, "batch", keysOf(q), liveBatch(f));
    const s = (await b.settle!)(b.state);
    expect(s.records.map((r) => r.processing)).toEqual(["completed", "failed", "failed"]);
    expect(s.records[2]!.error).toEqual({ code: "missing_outcome", description: "Processing returned no result for this message" });
  });
});

describe("stale and concurrent operations (I5)", () => {
  const slowOk = () => fakeFetch(async (keys) => { await sleep(40); return json({ mode: "anthropic", outcomes: keys.map((k) => okOutcome(k, "STALE DRAFT")) }); });

  it("reset while pending: the stale response mutates nothing", async () => {
    const q = queued();
    const b = begin(q, "batch", keysOf(q), liveBatch(slowOk().f));
    const afterReset = resetState(b.state);
    const s = (await b.settle!)(afterReset);
    expect(s.records).toEqual([]);
    expect(s.diagnostics.at(-1)).toMatchObject({ code: "stale_result" });
  });

  it("new import replacing a pending batch: the late response cannot touch the new batch", async () => {
    const q = queued();
    const b = begin(q, "batch", keysOf(q), liveBatch(slowOk().f));
    const replaced = queued(2, b.state);
    const s = (await b.settle!)(replaced);
    expect(s.records.map((r) => r.processing)).toEqual(["queued", "queued"]);
    expect(JSON.stringify(s.records)).not.toContain("STALE DRAFT");
  });

  it("repeated retry clicks start exactly one provider request", async () => {
    const failing = fakeFetch((k) => json({ mode: "anthropic", outcomes: k.map((x) => failOutcome(x, "provider_server_error")) }));
    const q = queued(2);
    const first = begin(q, "batch", keysOf(q), liveBatch(failing.f));
    const failed = (await first.settle!)(first.state);
    const retryFetch = slowOk();
    const r1 = begin(failed, "retry", keysOf(failed, "failed"), liveBatch(retryFetch.f));
    const r2 = begin(r1.state, "retry", keysOf(failed, "failed"), liveBatch(retryFetch.f));
    expect(r2.op).toBeNull();
    const s = (await r1.settle!)(r1.state);
    expect(retryFetch.calls).toHaveLength(1);
    expect(s.records.every((r) => r.processing === "completed")).toBe(true);
  });

  it("failed-only retry never reprocesses completed records and preserves approved and edited drafts", async () => {
    const first = fakeFetch((k) => json({ mode: "anthropic", outcomes: [okOutcome(k[0]!), okOutcome(k[1]!), failOutcome(k[2]!, "provider_overloaded")] }));
    const q = queued(3);
    const b = begin(q, "batch", keysOf(q), liveBatch(first.f));
    let s = (await b.settle!)(b.state);
    const [a, e] = [s.records[0]!.key, s.records[1]!.key];
    s = { ...s, records: updateRecord(updateRecord(s.records, a, approveDraft), e, (r) => editDraft(r, "Human-edited reply")) };
    const approved = s.records[0], edited = s.records[1];
    const retry = fakeFetch(async (keys) => { await sleep(20); return json({ mode: "anthropic", outcomes: [...keys.map((k) => okOutcome(k)), okOutcome(a, "OVERWRITE ATTEMPT")] }); });
    const r = begin(s, "retry", keysOf(s, "failed"), liveBatch(retry.f));
    const done = (await r.settle!)(r.state);
    expect(retry.calls).toEqual([[s.records[2]!.key]]);
    expect(done.records[0]).toBe(approved);
    expect(done.records[1]).toBe(edited);
    expect(done.records[1]!.currentDraft).toBe("Human-edited reply");
    expect(done.records[2]!.processing).toBe("completed");
    expect(done.diagnostics.at(-1)).toMatchObject({ code: "unexpected_outcome", count: 1 });
  });
});

describe("carry-forward C: simulation hook isolation (negative test)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    delete (window as { __MUST_SIM_PLAN__?: unknown }).__MUST_SIM_PLAN__;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("in Anthropic mode, __MUST_SIM_PLAN__ cannot force, replace or forge results; fixture ids still go to the server", async () => {
    const { f, calls } = fakeFetch((keys) => json({ mode: "anthropic", outcomes: keys.map((k) => failOutcome(k, "provider_server_error")) }));
    vi.stubGlobal("fetch", f);
    // A plan that, if honoured, would make every record succeed with canned fixture output.
    (window as { __MUST_SIM_PLAN__?: unknown }).__MUST_SIM_PLAN__ = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`b1:r${i + 2}`, ["ok", "ok"]]));
    render(<InboxApp mode={{ kind: "anthropic", model: "claude-haiku-5-5" }} />);
    fireEvent.click(screen.getByText("Load 6-message sample"));
    fireEvent.click(screen.getByText("Process 6 valid messages →"));
    expect(screen.getByText(/Nothing has been sent yet/)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText("Start AI processing →")); await sleep(20); });
    expect(calls).toEqual([Array.from({ length: 6 }, (_, i) => `b1:r${i + 2}`)]);
    // Every record settles as the genuine provider failure; no fixture draft (e.g. M003's canned hire claim) appears.
    expect(document.body.textContent).toContain("6 failed");
    expect(document.body.textContent).toContain("0 processed");
    expect(document.body.textContent).not.toContain("offer letter is being prepared");
    expect(document.body.textContent).not.toContain("Mock AI only");
    expect(document.getElementById("modeBadge")!.textContent).toContain("Live Anthropic AI");
    expect(SAMPLE_ROWS).toHaveLength(6);
  });

  it("in simulated mode the hook still drives deterministic tests and no request is made", async () => {
    const { f, calls } = fakeFetch(() => json({}));
    vi.stubGlobal("fetch", f);
    (window as { __MUST_SIM_PLAN__?: unknown }).__MUST_SIM_PLAN__ = { "b1:r2": ["fail"] };
    render(<InboxApp mode={{ kind: "simulated" }} />);
    fireEvent.click(screen.getByText("Load 6-message sample"));
    fireEvent.click(screen.getByText("Process 6 valid messages →"));
    await act(async () => { fireEvent.click(screen.getByText("Reveal simulated AI results →")); await sleep(10); });
    expect(calls).toHaveLength(0);
    expect(document.body.textContent).toContain("Mock AI only");
  });
});
