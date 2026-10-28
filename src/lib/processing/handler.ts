// AI-01 live processing request handler (server-only), mounted at POST /api/process. Local/development only: there is
// no authentication or abuse protection, so this paid endpoint must not be publicly deployed (README "Live mode").
import "server-only";
import { readConfig } from "./config";
import { LiveRequestSchema, MAX_BODY_BYTES, MAX_LIVE_MESSAGES, type FailureCode } from "./live-contract";
import { logOutcome, processRecords, sdkCreate, type CreateMessage } from "./provider";

const reject = (status: number, error: FailureCode) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

async function readBounded(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// `create` is injectable for tests only; the route always uses the real SDK client.
export async function handleProcess(req: Request, create?: CreateMessage): Promise<Response> {
  const config = readConfig();
  if (config.mode.kind === "simulated") return reject(409, "live_unavailable");
  if (config.mode.kind === "unavailable" || !config.apiKey) return reject(503, "live_unavailable");
  // Same-origin, loopback-only: a browser on another origin cannot spend this server's credits.
  const host = req.headers.get("host") ?? "";
  const origin = req.headers.get("origin");
  if (!LOOPBACK.test(host) || (origin !== null && origin !== `http://${host}`)) return reject(403, "request_invalid");
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return reject(415, "request_invalid");

  const text = await readBounded(req);
  if (text === null) return reject(413, "request_invalid");
  let json: unknown;
  try { json = JSON.parse(text); } catch { return reject(400, "request_invalid"); }
  const parsed = LiveRequestSchema.safeParse(json);
  if (!parsed.success) return reject(400, "request_invalid");
  // Rejected explicitly before any model call; never truncated.
  if (parsed.data.records.length > MAX_LIVE_MESSAGES) return reject(413, "live_batch_limit");

  const outcomes = await processRecords(parsed.data.records, config.model, create ?? sdkCreate(config.apiKey), { outer: req.signal });
  outcomes.forEach(logOutcome);
  return Response.json({ mode: "anthropic", outcomes }, { headers: { "cache-control": "no-store" } });
}
