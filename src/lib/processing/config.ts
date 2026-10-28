// Server-only processing configuration (AI-01). Read from the server environment at request time; never bundled,
// never returned to the browser except as the credential-free RuntimeMode.
import "server-only";
import type { RuntimeMode } from "./live-contract";

export const DEFAULT_MODEL = "claude-haiku-5-5";

export type LiveConfig = { mode: RuntimeMode; apiKey?: string; model: string };

// Unset mode → simulated. "anthropic" without a key (or an unknown mode value) → unavailable, never simulated:
// a misconfigured live server must not quietly present mock output.
export function readConfig(env: Record<string, string | undefined> = process.env): LiveConfig {
  const raw = (env.INBOX_PROCESSING_MODE ?? "").trim().toLowerCase();
  const model = (env.ANTHROPIC_MODEL ?? "").trim() || DEFAULT_MODEL;
  if (raw === "" || raw === "simulated") return { mode: { kind: "simulated" }, model };
  if (raw !== "anthropic") return { mode: { kind: "unavailable", reason: "Unknown INBOX_PROCESSING_MODE" }, model };
  const apiKey = (env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return { mode: { kind: "unavailable", reason: "ANTHROPIC_API_KEY is not configured" }, model };
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(model)) return { mode: { kind: "unavailable", reason: "ANTHROPIC_MODEL is invalid" }, model };
  return { mode: { kind: "anthropic", model }, apiKey, model };
}

export const runtimeMode = (): RuntimeMode => readConfig().mode;
