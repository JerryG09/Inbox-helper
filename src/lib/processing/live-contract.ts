// AI-01 live-processing contract shared by the browser adapter and the server route. Contains no secrets and no
// provider configuration: the model, prompt and credentials are server-only (./provider.ts, ./config.ts).
import { z } from "zod";
import { IntentIdSchema } from "../domain/intents";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "../import/validate";

// Server-authoritative runtime mode, resolved per request from server environment only (./config.ts).
export type RuntimeMode =
  | { kind: "simulated" }
  | { kind: "anthropic"; model: string }
  | { kind: "unavailable"; reason: string };

export const SIMULATED_MODE: RuntimeMode = { kind: "simulated" };

// First live demonstration: at most 10 messages per provider request, independent of the 50-record import cap.
export const MAX_LIVE_MESSAGES = 10;
export const MAX_BODY_BYTES = 64 * 1024;
export const PROVIDER_TIMEOUT_MS = 20_000;
export const PROVIDER_CONCURRENCY = 2;
// Browser-side bound on one whole request: ceil(10 / 2) sequential provider attempts of at most 20 s, plus slack.
export const CLIENT_REQUEST_TIMEOUT_MS = Math.ceil(MAX_LIVE_MESSAGES / PROVIDER_CONCURRENCY) * PROVIDER_TIMEOUT_MS + 15_000;

// Strict request shape: internal record key plus the validated candidate fields. Unknown fields (model, system,
// max_tokens, …) are rejected, so the caller cannot choose provider parameters.
export const LiveRecordSchema = z
  .object({
    key: z.string().regex(/^b\d{1,6}:r\d{1,6}$/),
    importedId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    candidateName: z.string().max(200).optional(),
    subject: z.string().max(300).optional(),
    message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  })
  .strict();

export const LiveRequestSchema = z
  .object({ records: z.array(LiveRecordSchema).min(1).max(MAX_MESSAGES) })
  .strict()
  .refine((b) => new Set(b.records.map((r) => r.key)).size === b.records.length, { message: "record keys must be unique" });

export type LiveRequest = z.infer<typeof LiveRequestSchema>;

// Safe, structured failure taxonomy. Descriptions are shown to the recruiter; provider error text never is.
export const FAILURES = {
  provider_timeout: "The AI provider did not respond within 20 seconds",
  provider_rate_limited: "The AI provider is rate limiting requests",
  provider_overloaded: "The AI provider is temporarily overloaded",
  provider_server_error: "The AI provider returned a server error",
  provider_auth: "Live AI is misconfigured on the server (credentials rejected)",
  provider_request_rejected: "The AI provider rejected the request",
  provider_network: "The AI provider could not be reached",
  provider_truncated: "The AI response was cut off before it was complete",
  provider_refusal: "The AI provider declined to process this message",
  provider_empty: "The AI provider returned an empty response",
  provider_schema_invalid: "The AI response did not match the required format",
  provider_unexpected_stop: "The AI response ended unexpectedly",
  live_unavailable: "Live AI processing is unavailable on this server",
  live_batch_limit: `Live processing is limited to ${MAX_LIVE_MESSAGES} messages per request. No model call was made`,
  request_invalid: "The processing request was rejected by the server. No model call was made",
  request_failed: "The processing request failed before results were returned",
  request_timeout: "The processing request took too long and was abandoned",
} as const;
export type FailureCode = keyof typeof FAILURES;

// Per-call metadata, kept apart from candidate-facing content. Only values the provider actually returned.
export const ProviderMetaSchema = z
  .object({
    provider: z.literal("anthropic"),
    model: z.string().max(100).nullable(),
    responseId: z.string().max(200).nullable(),
    requestId: z.string().max(200).nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    latencyMs: z.number().int().nonnegative(),
    stopReason: z.string().max(50).nullable(),
    code: z.string().max(50),
  })
  .strict();
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;

const LiveOutcomeSchema = z.discriminatedUnion("ok", [
  z
    .object({
      key: z.string(),
      ok: z.literal(true),
      source: z.literal("anthropic"),
      primaryIntent: IntentIdSchema,
      secondaryIntents: z.array(IntentIdSchema).max(5),
      summary: z.string().min(1).max(300),
      draft: z.string().min(1).max(1500),
      attentionReasons: z.array(z.string().min(1).max(200)).max(8),
      blocked: z.boolean(),
      meta: ProviderMetaSchema,
    })
    .strict(),
  z
    .object({
      key: z.string(),
      ok: z.literal(false),
      source: z.literal("anthropic"),
      code: z.string().max(50),
      description: z.string().max(200),
      meta: ProviderMetaSchema.optional(),
    })
    .strict(),
]);

export const LiveResponseSchema = z.object({ mode: z.literal("anthropic"), outcomes: z.array(LiveOutcomeSchema).max(MAX_MESSAGES) }).strict();
export type LiveResponse = z.infer<typeof LiveResponseSchema>;
export type LiveOutcome = LiveResponse["outcomes"][number];

// Error body for a request rejected as a whole (never contains provider text or candidate content).
export const LiveErrorSchema = z.object({ error: z.enum(Object.keys(FAILURES) as [FailureCode, ...FailureCode[]]) }).strict();
