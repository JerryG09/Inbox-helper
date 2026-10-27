import type { IntentId } from "../domain/intents";
import type { InboxRecord, OutcomeSource, ValidMessage } from "../domain/types";

// Adapter seam (contract §7). UI-03 uses the simulated processor in ./mock; a real provider is separately authorized.
export type ProcessOutcome =
  | {
      key: string;
      ok: true;
      source: OutcomeSource;
      primaryIntent: IntentId;
      secondaryIntents: IntentId[];
      summary: string;
      draft: string;
      attentionReasons: string[];
      blocked: boolean;
    }
  | { key: string; ok: false; source: OutcomeSource; code: string; description: string };

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

export const BLOCKED_FINDING = "Initial AI output asserted unsupported hiring decision";
export const UNSUPPORTED_HIRING_FLAG = "Unsupported hiring decision";

// Apply one outcome. Identity and original candidate fields are never touched; every completed record starts Pending.
export function applyOutcome(r: InboxRecord, o: ProcessOutcome): InboxRecord {
  if (o.key !== r.key) throw new Error(`outcome ${o.key} does not belong to record ${r.key}`);
  if (!o.ok) return { ...r, processing: "failed", error: { code: o.code, description: o.description }, review: undefined, outcomeSource: o.source };
  return {
    ...r,
    processing: "completed",
    error: undefined,
    primaryIntent: o.primaryIntent,
    secondaryIntents: o.secondaryIntents.filter((i) => i !== o.primaryIntent),
    aiSummary: o.summary,
    originalAiDraft: o.draft,
    currentDraft: o.draft,
    review: "pending",
    attention: o.blocked ? "blocked" : o.attentionReasons.length ? "warning" : "none",
    currentAttentionReasons: o.attentionReasons,
    historicalAiFindings: o.blocked ? [BLOCKED_FINDING] : o.attentionReasons,
    needsRecheck: o.blocked,
    outcomeSource: o.source,
  };
}
