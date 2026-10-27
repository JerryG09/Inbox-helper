// Pure, immutable human-review transitions (contract §4 `transitions.ts`), ported from editIntent/toggleSecondary/
// draftChanged/recheck/approve/reject in the approved V1.1 prototype. None of them sends anything or changes
// a candidate's hiring status; "rejected" always means the AI draft was rejected.
import type { IntentId } from "./intents";
import type { InboxRecord } from "./types";
import { BLOCKED_FINDING, UNSUPPORTED_HIRING_FLAG } from "../processing/processor";
import { forbiddenDraft } from "../inbox/inbox";

// The record's initial AI output contained an unsupported hiring claim (prototype `blocker`). Permanent history.
export const hadBlocker = (r: InboxRecord) => r.historicalAiFindings.includes(BLOCKED_FINDING);
// Blocker cleared by an explicit limited recheck (prototype `resolved`).
export const blockerResolved = (r: InboxRecord) => hadBlocker(r) && !r.needsRecheck;

// Recompute current attention from the resolved flag. Historical findings are never touched.
function withBlockerState(r: InboxRecord, resolved: boolean): InboxRecord {
  if (!hadBlocker(r)) return r;
  const others = r.currentAttentionReasons.filter((x) => x !== UNSUPPORTED_HIRING_FLAG);
  const currentAttentionReasons = resolved ? others : [UNSUPPORTED_HIRING_FLAG, ...others];
  return { ...r, needsRecheck: !resolved, currentAttentionReasons, attention: resolved ? (others.length ? "warning" : "none") : "blocked" };
}

const completed = (r: InboxRecord) => r.processing === "completed";

export function canApprove(r: InboxRecord): boolean {
  const draft = r.currentDraft ?? "";
  return completed(r) && Boolean(draft.trim()) && r.attention !== "blocked" && !forbiddenDraft(draft);
}

// Primary correction. An existing secondary promoted to primary leaves the former primary as secondary.
export function correctPrimary(r: InboxRecord, value: IntentId): InboxRecord {
  if (!completed(r) || r.primaryIntent === value) return r;
  const old = r.primaryIntent;
  const base = r.secondaryIntents.includes(value) ? [...r.secondaryIntents.filter((i) => i !== value), old] : r.secondaryIntents.filter((i) => i !== value);
  const secondaryIntents = [...new Set(base)].filter((i): i is IntentId => Boolean(i) && i !== value);
  return { ...r, primaryIntent: value, secondaryIntents, review: "pending" };
}

export function toggleSecondary(r: InboxRecord, intent: IntentId, checked: boolean): InboxRecord {
  if (!completed(r) || intent === r.primaryIntent) return r;
  const secondaryIntents = checked ? [...new Set([...r.secondaryIntents, intent])] : r.secondaryIntents.filter((i) => i !== intent);
  return { ...r, secondaryIntents, review: "pending" };
}

// Any edit resets review to Pending. For a record whose AI output was blocked, an edit re-activates the blocker
// until the explicit recheck passes again. originalAiDraft is never modified.
export function editDraft(r: InboxRecord, text: string): InboxRecord {
  if (!completed(r)) return r;
  return withBlockerState({ ...r, currentDraft: text, review: "pending" }, false);
}

export type RecheckResult = { record: InboxRecord; passed: boolean };

// LIMITED mock phrase check: passes only if the draft is non-empty, differs from the original AI draft, and
// contains none of the listed phrases. It cannot certify safety; a human must still review and approve.
export function recheckDraft(r: InboxRecord): RecheckResult {
  if (!completed(r) || !hadBlocker(r)) return { record: r, passed: false };
  const draft = r.currentDraft ?? "";
  const passed = Boolean(draft.trim()) && draft !== r.originalAiDraft && !forbiddenDraft(draft);
  return passed ? { record: { ...withBlockerState(r, true), review: "pending" }, passed } : { record: r, passed };
}

export function approveDraft(r: InboxRecord): InboxRecord {
  return canApprove(r) ? { ...r, review: "approved" } : r;
}

export function rejectDraft(r: InboxRecord): InboxRecord {
  return completed(r) ? { ...r, review: "rejected" } : r;
}

// Apply a transition to one record by key; every other record is returned unchanged (same object).
export function updateRecord(records: readonly InboxRecord[], key: string, fn: (r: InboxRecord) => InboxRecord): InboxRecord[] {
  return records.map((r) => (r.key === key ? fn(r) : r));
}
