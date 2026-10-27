import { INTENTS, type IntentId } from "../domain/intents";
import type { InboxRecord, ProcessingStatus, ReviewStatus } from "../domain/types";

// Inbox view logic ported from stats()/filtered()/groupedList()/currentRecord() in the approved V1.1 prototype.
export type ProcessFilter = "All" | "Completed" | "Failed";
export type ReviewFilter = "All" | "Pending" | "Approved" | "Rejected";

export type InboxView = {
  selectedKey: string | null;
  reviewFilter: ReviewFilter;
  processFilter: ProcessFilter;
  attentionOnly: boolean;
  mobileDetail: boolean;
};

export const initialInboxView: InboxView = { selectedKey: null, reviewFilter: "Pending", processFilter: "All", attentionOnly: false, mobileDetail: false };

export const PROCESSING_LABEL: Record<ProcessingStatus, string> = { queued: "Queued", processing: "Processing", completed: "Completed", failed: "Failed" };
export const REVIEW_LABEL: Record<ReviewStatus, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
export const intentLabel = (id: IntentId) => INTENTS.find((i) => i.id === id)!.label;

export const hasCurrentAttention = (r: InboxRecord) => r.processing === "completed" && r.attention !== "none";

export function stats(records: readonly InboxRecord[]) {
  const completed = records.filter((r) => r.processing === "completed");
  return {
    total: records.length,
    queued: records.filter((r) => r.processing === "queued").length,
    processing: records.filter((r) => r.processing === "processing").length,
    completed: completed.length,
    failed: records.filter((r) => r.processing === "failed").length,
    pending: completed.filter((r) => r.review === "pending").length,
    approved: completed.filter((r) => r.review === "approved").length,
    rejected: completed.filter((r) => r.review === "rejected").length,
    attention: completed.filter(hasCurrentAttention).length,
  };
}

export function filtered(records: readonly InboxRecord[], v: InboxView) {
  return records.filter((r) => {
    if (v.processFilter !== "All" && PROCESSING_LABEL[r.processing] !== v.processFilter) return false;
    if (r.processing === "completed" && v.reviewFilter !== "All" && REVIEW_LABEL[r.review!] !== v.reviewFilter) return false;
    if (r.processing === "failed" && v.reviewFilter !== "All") return false;
    if (v.attentionOnly && !hasCurrentAttention(r)) return false;
    return true;
  });
}

// Exactly one group per record: failed → "Failed processing", otherwise its primary intent (unclassified → Other / unclear).
export function groupKey(r: InboxRecord): string {
  if (r.processing === "failed") return "Failed processing";
  return r.primaryIntent ? intentLabel(r.primaryIntent) : "Other / unclear";
}

export function grouped(records: readonly InboxRecord[]): [string, InboxRecord[]][] {
  const groups = new Map<string, InboxRecord[]>();
  for (const r of records) {
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return Array.from(groups);
}

// If the selection is filtered out, select the first visible record (prototype renderInbox()).
export function resolveSelection(visible: readonly InboxRecord[], selectedKey: string | null): string | null {
  return visible.some((r) => r.key === selectedKey) ? selectedKey : visible[0]?.key ?? null;
}

export function setProcessFilter(v: InboxView, processFilter: ProcessFilter): InboxView {
  return { ...v, processFilter, mobileDetail: false, reviewFilter: processFilter === "Failed" ? "All" : v.reviewFilter };
}
export const setReviewFilter = (v: InboxView, reviewFilter: ReviewFilter): InboxView => ({ ...v, reviewFilter, mobileDetail: false });
export const setAttentionOnly = (v: InboxView, attentionOnly: boolean): InboxView => ({ ...v, attentionOnly, mobileDetail: false });
export const clearFilters = (v: InboxView): InboxView => ({ ...v, processFilter: "All", reviewFilter: "All", attentionOnly: false });
export const showFailedQueue = (v: InboxView): InboxView => ({ ...v, processFilter: "Failed", reviewFilter: "All", attentionOnly: false, mobileDetail: false });
export const selectRecord = (v: InboxView, key: string): InboxView => ({ ...v, selectedKey: key, mobileDetail: true });

// "Next pending →": cycle through Pending records; with none left the prototype navigates to Results (returns null).
export function nextPending(records: readonly InboxRecord[], v: InboxView): InboxView | null {
  const pend = records.filter((r) => r.processing === "completed" && r.review === "pending");
  if (!pend.length) return null;
  const idx = pend.findIndex((r) => r.key === v.selectedKey);
  return { ...v, selectedKey: pend[(idx + 1) % pend.length]!.key, reviewFilter: "Pending", processFilter: "All", attentionOnly: false, mobileDetail: true };
}

// After revealing results: Pending filter, first completed record selected, list shown on mobile.
export function viewAfterReveal(records: readonly InboxRecord[]): InboxView {
  return { ...initialInboxView, selectedKey: records.find((r) => r.processing === "completed")?.key ?? records[0]?.key ?? null };
}

export const initials = (r: InboxRecord) =>
  (r.candidateName || r.importedId).split(/\s+/).map((n) => n[0] || "").slice(0, 2).join("").toUpperCase();

export const forbiddenDraft = (v: string) =>
  /\b(you have been hired|you've been hired|you are hired|you're hired|offer letter is being prepared|your application has been accepted)\b/i.test(v);
