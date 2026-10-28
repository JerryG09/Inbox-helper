// Processing integrity (UI-05A). Pure reconciliation of adapter outcomes against an operation's immutable target keys.
// Identity authority is the internal record key, never the candidate-supplied importedId.
import type { InboxRecord } from "../domain/types";
import { applyOutcome, type ProcessOutcome } from "./processor";

export type OperationKind = "batch" | "retry";

// One in-flight processing operation. `id` is unique for the lifetime of the page (never reused, survives reset).
export type Operation = { id: number; kind: OperationKind; keys: readonly string[] };

// Content-free diagnostic: codes, counts and internal ids only — never candidate text, outcome text or secrets.
export type DiagnosticCode = "unexpected_outcome" | "duplicate_outcome" | "missing_outcome" | "adapter_exception" | "stale_result";
export type Diagnostic = { opId: number; code: DiagnosticCode; count: number };
export const MAX_DIAGNOSTICS = 20;

export const INTEGRITY_ERRORS = {
  missing_outcome: "Simulated processing returned no result for this message",
  duplicate_outcome: "Processing returned conflicting results for this message",
  adapter_exception: "Simulated processing failed unexpectedly",
} as const;

const integrityFailure = (r: InboxRecord, code: keyof typeof INTEGRITY_ERRORS): InboxRecord => ({
  ...r, processing: "failed", error: { code, description: INTEGRITY_ERRORS[code] }, review: undefined,
});

// Only a target still in `processing` may settle; anything else (unrelated or already settled) is returned as the same object.
const active = (r: InboxRecord, targets: ReadonlySet<string>) => targets.has(r.key) && r.processing === "processing";

// I1–I4, I7: every active target ends in exactly one terminal state; no outcome can create, overwrite or touch a non-target.
export function reconcile(records: readonly InboxRecord[], op: Operation, outcomes: readonly ProcessOutcome[]) {
  const targets = new Set(op.keys);
  const byKey = new Map<string, ProcessOutcome[]>();
  let unexpected = 0;
  for (const o of outcomes) {
    if (!targets.has(o.key)) { unexpected++; continue; }
    byKey.set(o.key, [...(byKey.get(o.key) ?? []), o]);
  }
  let missing = 0, duplicate = 0;
  const next = records.map((r) => {
    if (!active(r, targets)) return r;
    const mine = byKey.get(r.key) ?? [];
    if (mine.length === 0) { missing++; return integrityFailure(r, "missing_outcome"); }
    if (mine.length > 1) { duplicate++; return integrityFailure(r, "duplicate_outcome"); }
    return applyOutcome(r, mine[0]!);
  });
  const diagnostics: Diagnostic[] = [];
  if (unexpected) diagnostics.push({ opId: op.id, code: "unexpected_outcome", count: unexpected });
  if (duplicate) diagnostics.push({ opId: op.id, code: "duplicate_outcome", count: duplicate });
  if (missing) diagnostics.push({ opId: op.id, code: "missing_outcome", count: missing });
  return { records: next, diagnostics };
}

// I6: the adapter threw or rejected — every still-active target settles as an explicit failure.
export function failAll(records: readonly InboxRecord[], op: Operation) {
  const targets = new Set(op.keys);
  let count = 0;
  const next = records.map((r) => (active(r, targets) ? (count++, integrityFailure(r, "adapter_exception")) : r));
  return { records: next, diagnostics: count ? [{ opId: op.id, code: "adapter_exception" as const, count }] : [] };
}

export const appendDiagnostics = (prior: readonly Diagnostic[], add: readonly Diagnostic[]) =>
  add.length ? [...prior, ...add].slice(-MAX_DIAGNOSTICS) : (prior as Diagnostic[]);
