// Controlled fake of the Anthropic Messages endpoint for the live-mode browser tests (AI-01). The app's real SDK
// client is pointed here with ANTHROPIC_BASE_URL, so the genuine server path runs end to end without paid tokens.
// It is NOT a model: every reply is deterministic, steered by markers in the synthetic candidate message:
//   [[delay:N]] wait N ms then succeed      [[fail:STATUS]] return that HTTP error (after any delay)
//   [[fail-once]] fail with 500 on the first call for this message, succeed afterwards
//   [[truncate]] stop_reason max_tokens     [[schema]] malformed JSON      [[hired]] draft asserts a hire
//   [[offer]] draft makes an unverified offer (AI-01 R1) while reporting unsupported_hiring_decision: false
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_ANTHROPIC_PORT ?? 3199);
const EXPECTED_KEY = "sk-ant-fake-e2e-not-a-real-key";
const seen = new Map();
const calls = [];

const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", "request-id": `req_fake_${calls.length}` }); res.end(JSON.stringify(body)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

createServer(async (req, res) => {
  if (req.url === "/__calls") return send(res, 200, calls);
  if (req.url === "/__reset") { calls.length = 0; seen.clear(); return send(res, 200, {}); }
  if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) return send(res, 404, { type: "error", error: { type: "not_found_error", message: "no" } });
  // Guard: if a real credential ever reached this fake, fail loudly instead of accepting it.
  // (SDK 1.x sends the key as "Authorization: Bearer"; older clients use x-api-key.)
  const key = req.headers["x-api-key"] ?? String(req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (key !== EXPECTED_KEY) return send(res, 401, { type: "error", error: { type: "authentication_error", message: "unexpected key" } });
  let raw = "";
  for await (const c of req) raw += c;
  const body = JSON.parse(raw);
  const user = String(body.messages?.[0]?.content ?? "");
  const data = JSON.parse(user.split("\n")[2] ?? "{}");
  const msg = String(data.message ?? "");
  calls.push({ model: body.model, max_tokens: body.max_tokens, thinking: body.thinking, format: body.output_config?.format?.type, sampling: ["temperature", "top_p", "top_k"].filter((k) => k in body), marker: (msg.match(/\[\[[^\]]+\]\]/g) ?? []).join("") });

  const delay = Number(msg.match(/\[\[delay:(\d+)\]\]/)?.[1] ?? 0);
  if (delay) await sleep(delay);
  const status = Number(msg.match(/\[\[fail:(\d+)\]\]/)?.[1] ?? 0);
  const failOnce = msg.includes("[[fail-once]]") && !seen.has(msg);
  seen.set(msg, true);
  if (status || failOnce) {
    const s = status || 500;
    return send(res, s, { type: "error", error: { type: s === 429 ? "rate_limit_error" : "api_error", message: "INTERNAL-PROVIDER-DETAIL-MUST-NOT-SHOW" } });
  }
  const first = String(data.candidate_name ?? "").split(/\s+/)[0] || "there";
  const out = {
    primary_intent: /interview/i.test(msg) ? "interview_scheduling" : /appl/i.test(msg) ? "application_status" : "job_information",
    secondary_intents: /link/i.test(msg) ? ["documentation_technical"] : [],
    summary: "Fake upstream summary for a synthetic test message.",
    draft_reply: msg.includes("[[hired]]") ? `Congratulations ${first}, you have been hired!` : msg.includes("[[offer]]") ? `Congratulations ${first}, we would like to offer you the Customer Support role.` : `Hi ${first}, thank you for your message. The recruitment team will review it and follow up. (fake upstream draft)`,
    attention_reasons: [],
    unsupported_hiring_decision: false,
  };
  const text = msg.includes("[[schema]]") ? '{"primary_intent":"nonsense"' : JSON.stringify(out);
  send(res, 200, {
    id: `msg_fake_${calls.length}`, type: "message", role: "assistant", model: body.model, stop_sequence: null,
    stop_reason: msg.includes("[[truncate]]") ? "max_tokens" : "end_turn",
    content: [{ type: "text", text }], usage: { input_tokens: 700, output_tokens: 90 },
  });
}).listen(PORT, "127.0.0.1");
