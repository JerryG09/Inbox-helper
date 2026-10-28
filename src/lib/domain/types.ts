import type { IntentId } from "./intents";
import type { ProviderMeta } from "../processing/live-contract";

// Canonical state model (contract §5).
export type ProcessingStatus = "queued" | "processing" | "completed" | "failed";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AttentionSeverity = "none" | "warning" | "blocked";

// One row as read from CSV or manual entry, before validation. Values are untrimmed, as supplied.
export type RawRow = {
  id: string;
  candidate_name: string;
  subject: string;
  message: string;
  sourceRow?: number; // 1-based line in the file, header = 1
  columnMismatch?: boolean;
};

// A validated message ready for processing. `key` is internal and unique across imports;
// `importedId` is the user-supplied id and may repeat across separate imports.
export type ValidMessage = {
  key: string;
  importedId: string;
  candidateName?: string;
  subject?: string;
  message: string;
  sourceRow: number;
};

export type InvalidRow = {
  sourceRow: number;
  importedId: string;
  candidateName: string;
  subject: string;
  message: string;
  reasons: string[];
};

// What the validation preview table shows for each input row, in input order.
export type PreviewRow = { sourceRow: number; id: string; candidateName: string; subject: string; reasons: string[] | null };

export type InboxRecord = {
  key: string;
  importedId: string;
  candidateName?: string;
  subject?: string;
  message: string;
  processing: ProcessingStatus;
  error?: { code: string; description: string };
  primaryIntent?: IntentId;
  secondaryIntents: IntentId[];
  aiSummary?: string;
  originalAiDraft?: string;
  currentDraft?: string;
  review?: ReviewStatus;
  attention: AttentionSeverity;
  currentAttentionReasons: string[];
  historicalAiFindings: string[];
  needsRecheck: boolean;
  // Who produced the classification/draft. Simulated sources are never a real model response.
  outcomeSource?: OutcomeSource;
  // Genuine-provider call metadata (model, ids, tokens, latency). Kept apart from candidate-facing content.
  providerMeta?: ProviderMeta;
};

export type OutcomeSource = "simulated_fixture" | "simulated_fallback" | "anthropic";
