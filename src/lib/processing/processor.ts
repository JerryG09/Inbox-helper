import type { InboxRecord, ValidMessage } from "../domain/types";
import type { Classification } from "../domain/intents";

// Adapter seam (contract §7). UI-02 only prepares queued records; no processor is implemented or called yet.
export type ProcessOutcome = { key: string } & ({ ok: true; classification: Classification; draft: string } | { ok: false; code: string; description: string });
export type ProcessBatch = (messages: ValidMessage[]) => Promise<ProcessOutcome[]>;
export type RetryMessage = (recordKey: string) => Promise<ProcessOutcome>;

export function toQueuedRecords(valid: readonly ValidMessage[]): InboxRecord[] {
  return valid.map((m) => ({
    key: m.key,
    importedId: m.importedId,
    candidateName: m.candidateName,
    subject: m.subject,
    message: m.message,
    processing: "queued",
    secondaryIntents: [],
    attention: "none",
    currentAttentionReasons: [],
    historicalAiFindings: [],
    needsRecheck: false,
  }));
}
