// @vitest-environment node
// AI-02B: provider failures over real HTTP. The genuine Anthropic SDK client (sdkCreate) talks to an in-process fake
// upstream on 127.0.0.1, so status-code mapping, maxRetries 0, abort and network failure are observed on the wire
// rather than through hand-built SDK error objects. No real credential, no network beyond loopback, no paid tokens.
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { handleProcess } from "@/lib/processing/handler";
import { processOne, processRecords, sdkCreate } from "@/lib/processing/provider";

const KEY = "sk-ant-fake-ai02-not-a-real-key";
const LEAK = "INTERNAL-PROVIDER-DETAIL-MUST-NOT-SHOW";
const good = { primary_intent: "application_status", secondary_intents: [], summary: "Asks for an update.", draft_reply: "Hi, the recruitment team will review and follow up.", attention_reasons: [], unsupported_hiring_decision: false };

// Steered by a marker in the candidate message: [[status:N]] error, [[hang]] never answers, else success after 25 ms.
let hits = 0, inFlight = 0, peak = 0;
let server: Server;
let base = "";
beforeAll(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    hits++; inFlight++; peak = Math.max(peak, inFlight);
    const msg = String(JSON.parse(raw).messages?.[0]?.content ?? "");
    const done = (status: number, body: unknown) => { inFlight--; res.writeHead(status, { "content-type": "application/json", "request-id": `req_http_${hits}` }); res.end(JSON.stringify(body)); };
    if (msg.includes("[[hang]]")) { res.on("close", () => inFlight--); return; }
    const status = Number(msg.match(/\[\[status:(\d+)\]\]/)?.[1] ?? 0);
    if (status) return done(status, { type: "error", error: { type: "api_error", message: LEAK } });
    await new Promise((r) => setTimeout(r, 25));
    done(200, { id: `msg_http_${hits}`, type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn", stop_sequence: null, content: [{ type: "text", text: JSON.stringify(good) }], usage: { input_tokens: 10, output_tokens: 5 } });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); hits = 0; peak = 0; });

const rec = (n: number, message: string) => ({ key: `b1:r${n + 1}`, importedId: `H${n}`, message });
const create = () => { vi.stubEnv("ANTHROPIC_BASE_URL", base); return sdkCreate(KEY); };

describe("HTTP status → safe failure code, exactly one attempt (SDK automatic retries disabled)", () => {
  // 429, 500 and 529 are all retried by the SDK by default; a single hit proves maxRetries: 0 on the wire.
  for (const [status, code] of [[429, "provider_rate_limited"], [500, "provider_server_error"], [529, "provider_overloaded"], [401, "provider_auth"]] as const) {
    it(`${status} → ${code}; one upstream request; no provider text`, async () => {
      const o = await processOne(rec(0, `Status? [[status:${status}]]`), "claude-haiku-5-5", create());
      expect(o).toMatchObject({ ok: false, source: "anthropic", code });
      expect(hits).toBe(1);
      expect(JSON.stringify(o)).not.toContain(LEAK);
    });
  }
  it("connection refused → provider_network, no provider text", async () => {
    vi.stubEnv("ANTHROPIC_BASE_URL", "http://127.0.0.1:9"); // discard port: nothing listens
    const o = await processOne(rec(0, "Status?"), "claude-haiku-5-5", sdkCreate(KEY));
    expect(o).toMatchObject({ ok: false, code: "provider_network" });
  });
  it("no response before the per-call deadline → provider_timeout, and the HTTP request is aborted", async () => {
    const o = await processOne(rec(0, "Status? [[hang]]"), "claude-haiku-5-5", create(), { timeoutMs: 150 });
    expect(o).toMatchObject({ ok: false, code: "provider_timeout" });
    await vi.waitFor(() => expect(inFlight).toBe(0));
  });
});

describe("mixed batch through the route handler over HTTP", () => {
  it("successes and failures settle per record in order; body and logs carry no provider text or key", async () => {
    vi.stubEnv("INBOX_PROCESSING_MODE", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", KEY);
    vi.stubEnv("ANTHROPIC_BASE_URL", base);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const records = ["Status?", "Status? [[status:529]]", "Status?", "Status? [[status:429]]"].map((m, i) => rec(i, m));
    const res = await handleProcess(new Request("http://127.0.0.1:3000/api/process", {
      method: "POST", body: JSON.stringify({ records }),
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" },
    }));
    const body = await res.json();
    expect(body.outcomes.map((o: { key: string; ok: boolean; code?: string }) => [o.key, o.ok, o.code ?? "ok"])).toEqual([
      ["b1:r1", true, "ok"], ["b1:r2", false, "provider_overloaded"], ["b1:r3", true, "ok"], ["b1:r4", false, "provider_rate_limited"],
    ]);
    expect(hits).toBe(4);
    const all = JSON.stringify(body) + log.mock.calls.flat().join("\n");
    expect(all).not.toContain(LEAK);
    expect(all).not.toContain(KEY);
  });
});

describe("concurrency ceiling scope (KNOWN_LIMITATION characterisation)", () => {
  it("each request is capped at 2 in flight; two independent requests together reach 4 (no server-wide cap)", async () => {
    const six = Array.from({ length: 6 }, (_, i) => rec(i, "Status?"));
    await processRecords(six, "claude-haiku-5-5", create());
    expect(peak).toBe(2);
    peak = 0;
    await Promise.all([processRecords(six, "claude-haiku-5-5", create()), processRecords(six, "claude-haiku-5-5", create())]);
    expect(peak).toBe(4);
  });
});
