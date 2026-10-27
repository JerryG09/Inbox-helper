import { ClassificationSchema } from "../domain/intents";
import type { Prediction } from "./score";

// What the runner records for one API call (subset used for interpretation).
export type CallRecord = { id: string; error?: string; stopReason?: string; text?: string };

// Turn one API call record into a Prediction. Order matters:
// 1. transport/API error → processing_failure
// 2. stop_reason "max_tokens" → truncated (distinct failure, even if the text happens to parse)
// 3. invalid JSON / schema failure → processing_failure
export function interpret(r: CallRecord): Prediction & { validationIssues?: unknown } {
  if (r.error && r.error !== "invalid_json" && r.error !== "schema_validation_failed" && r.error !== "truncated_max_tokens") {
    return { id: r.id, output: null, error: r.error, errorKind: "processing_failure" };
  }
  if (r.stopReason === "max_tokens") return { id: r.id, output: null, error: "truncated_max_tokens", errorKind: "truncated" };
  let json: unknown;
  try {
    json = JSON.parse(r.text ?? "");
  } catch {
    return { id: r.id, output: null, error: "invalid_json", errorKind: "processing_failure" };
  }
  const parsed = ClassificationSchema.safeParse(json);
  if (!parsed.success) return { id: r.id, output: null, error: "schema_validation_failed", errorKind: "processing_failure", validationIssues: parsed.error.issues };
  return { id: r.id, output: parsed.data };
}
