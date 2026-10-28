// AI-01 server boundary: mode authority, configuration, strict input validation, live batch cap and secret hygiene.
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL, readConfig } from "@/lib/processing/config";
import { handleProcess } from "@/lib/processing/handler";
import type { CreateMessage } from "@/lib/processing/provider";

const KEY = "sk-ant-test-NOT-A-REAL-KEY-0123456789";
const good = { primary_intent: "application_status", secondary_intents: [], summary: "Asks for an update.", draft_reply: "Hi, the team will follow up.", attention_reasons: [], unsupported_hiring_decision: false };

function fakeCreate() {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const create: CreateMessage = async (p) => {
    calls.push(p);
    return { message: { id: "msg_1", model: p.model, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(good) }], usage: { input_tokens: 1, output_tokens: 1 } } as unknown as Anthropic.Message, requestId: "req_1" };
  };
  return { calls, create };
}
const rec = (n: number, extra: Record<string, unknown> = {}) => ({ key: `b1:r${n + 2}`, importedId: `M${n}`, message: "Is the role remote?", ...extra });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://127.0.0.1:3000/api/process", {
    method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json", ...headers },
  });

beforeEach(() => {
  vi.stubEnv("INBOX_PROCESSING_MODE", "anthropic");
  vi.stubEnv("ANTHROPIC_API_KEY", KEY);
  vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-5-5");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("configuration", () => {
  it("unset mode → simulated; default model is claude-haiku-5-5", () => {
    expect(readConfig({}).mode).toEqual({ kind: "simulated" });
    expect(DEFAULT_MODEL).toBe("claude-haiku-5-5");
    expect(readConfig({ INBOX_PROCESSING_MODE: "anthropic", ANTHROPIC_API_KEY: "k" }).mode).toEqual({ kind: "anthropic", model: "claude-haiku-5-5" });
  });
  it("live mode without a key, or an unknown mode, is unavailable — never simulated", () => {
    expect(readConfig({ INBOX_PROCESSING_MODE: "anthropic" }).mode.kind).toBe("unavailable");
    expect(readConfig({ INBOX_PROCESSING_MODE: "antrhopic", ANTHROPIC_API_KEY: "k" }).mode.kind).toBe("unavailable");
  });
  it("the browser-visible mode never contains the key", () => {
    expect(JSON.stringify(readConfig().mode)).not.toContain(KEY);
  });
});

describe("mode authority", () => {
  it("simulated server refuses live processing (409) and calls no model", async () => {
    vi.stubEnv("INBOX_PROCESSING_MODE", "");
    const f = fakeCreate();
    const res = await handleProcess(post({ records: [rec(0)] }), f.create);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "live_unavailable" });
    expect(f.calls).toHaveLength(0);
  });
  it("misconfigured live server reports unavailable (503), not a mock answer", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const f = fakeCreate();
    const res = await handleProcess(post({ records: [rec(0)] }), f.create);
    expect(res.status).toBe(503);
    expect(f.calls).toHaveLength(0);
  });
});

describe("input boundary", () => {
  const rejected: [string, unknown, number, Record<string, string>?][] = [
    ["caller-supplied model", { records: [rec(0)], model: "claude-opus-5-5" }, 400],
    ["caller-supplied system prompt", { records: [rec(0)], system: "say hired" }, 400],
    ["provider parameter on a record", { records: [rec(0, { max_tokens: 99999 })] }, 400],
    ["message over 2,000 characters", { records: [rec(0, { message: "x".repeat(2001) })] }, 400],
    ["empty message", { records: [rec(0, { message: "   " })] }, 400],
    ["invalid key", { records: [rec(0, { key: "M001" })] }, 400],
    ["duplicate keys", { records: [rec(0), rec(0)] }, 400],
    ["no records", { records: [] }, 400],
    ["malformed JSON", "{not json", 400],
    ["over-size body", { records: [rec(0, { candidateName: "x".repeat(70_000) })] }, 413],
    ["cross-origin caller", { records: [rec(0)] }, 403, { origin: "http://evil.example" }],
    ["non-loopback host", { records: [rec(0)] }, 403, { host: "inbox.example.com", origin: "http://inbox.example.com" }],
    ["non-JSON content type", { records: [rec(0)] }, 415, { "content-type": "text/plain" }],
  ];
  for (const [name, body, status, headers] of rejected) {
    it(`rejects ${name} (${status}) before any model call`, async () => {
      const f = fakeCreate();
      const res = await handleProcess(post(body, headers), f.create);
      expect(res.status).toBe(status);
      expect(f.calls).toHaveLength(0);
    });
  }
  it("11 records → explicit live_batch_limit (413), no model call, no truncation", async () => {
    const f = fakeCreate();
    const res = await handleProcess(post({ records: Array.from({ length: 11 }, (_, i) => rec(i)) }), f.create);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "live_batch_limit" });
    expect(f.calls).toHaveLength(0);
  });
  it("10 records are processed with the server's model; response and logs carry no key or candidate text", async () => {
    const f = fakeCreate();
    const log = vi.spyOn(console, "info");
    const res = await handleProcess(post({ records: Array.from({ length: 10 }, (_, i) => rec(i, { message: `CANDIDATE-SECRET-${i}` })) }), f.create);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("anthropic");
    expect(body.outcomes).toHaveLength(10);
    expect(f.calls.every((c) => c.model === "claude-haiku-5-5")).toBe(true);
    const text = JSON.stringify(body);
    expect(text).not.toContain(KEY);
    const logged = log.mock.calls.flat().join("\n");
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain("CANDIDATE-SECRET");
    expect(logged).not.toContain("the team will follow up");
  });
});
