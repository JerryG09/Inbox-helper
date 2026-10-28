// Browser adapter for genuine Anthropic processing (AI-01). Sends only validated candidate fields to the same-origin
// server route; it has no access to credentials, model or prompt, and never consults the simulation test hook.
import type { ValidMessage } from "../domain/types";
import { CLIENT_REQUEST_TIMEOUT_MS, FAILURES, LiveErrorSchema, LiveResponseSchema, MAX_LIVE_MESSAGES, type FailureCode } from "./live-contract";
import type { ProcessBatch, ProcessOutcome } from "./processor";

const failEach = (messages: readonly ValidMessage[], code: FailureCode): ProcessOutcome[] =>
  messages.map((m) => ({ key: m.key, ok: false, source: "anthropic", code, description: FAILURES[code] }));

export function liveBatch(fetchImpl: typeof fetch = (...a) => fetch(...a), timeoutMs = CLIENT_REQUEST_TIMEOUT_MS): ProcessBatch {
  return async (messages) => {
    if (!messages.length) return [];
    // Mirrors the server limit so an oversized request never leaves the browser; the server enforces it independently.
    if (messages.length > MAX_LIVE_MESSAGES) return failEach(messages, "live_batch_limit");
    const records = messages.map((m) => ({ key: m.key, importedId: m.importedId, candidateName: m.candidateName, subject: m.subject, message: m.message }));
    let res: Response;
    try {
      res = await fetchImpl("/api/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ records }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      return failEach(messages, (e as { name?: string } | null)?.name === "TimeoutError" ? "request_timeout" : "request_failed");
    }
    let body: unknown;
    try { body = await res.json(); } catch { return failEach(messages, "request_failed"); }
    if (!res.ok) {
      const err = LiveErrorSchema.safeParse(body);
      return failEach(messages, err.success ? err.data.error : "request_failed");
    }
    const parsed = LiveResponseSchema.safeParse(body);
    // Anything but a well-formed genuine-provider response settles every target as failed; reconcile() then handles
    // missing, duplicate and unexpected keys exactly as for any adapter.
    return parsed.success ? parsed.data.outcomes : failEach(messages, "request_failed");
  };
}

export const liveAdapters = (fetchImpl?: typeof fetch): { batch: ProcessBatch; retry: ProcessBatch } => {
  const batch = liveBatch(fetchImpl);
  return { batch, retry: batch };
};
