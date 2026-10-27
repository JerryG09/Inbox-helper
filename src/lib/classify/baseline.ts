import type { Classification, IntentId } from "../domain/intents";

// Deterministic keyword baseline, established before any model evaluation. It is NOT AI.
// Rules are ordered; the first match becomes primary, later matches become secondary.
const RULES: ReadonlyArray<[IntentId, RegExp]> = [
  ["withdrawal", /\b(withdraw|withdrawal|remove me|remove my application|no longer interested)\b/],
  ["interview_scheduling", /\b(interview|reschedul\w*|appointment|move it|clash\w*)\b/],
  ["documentation_technical", /\b(cv|resume|upload\w*|portal|link|documents?|certificates?|error)\b/],
  ["application_status", /\b(applied|application|status|decision|hired|heard back|update)\b/],
  ["job_information", /\b(remote|salary|role|benefits|travel|team|start date|position)\b/],
];

const ATTENTION: ReadonlyArray<[string, RegExp]> = [
  ["Possible instruction injection", /\b(ignore (all )?previous instructions|system prompt)\b/],
  ["Requests a hiring decision", /\b(did i get the job|confirm my offer|am i hired)\b/],
  ["Spreadsheet-formula-like input", /^[\s]*[=+\-@]/m],
  ["Escalation or threat", /\b(post about|lawyer|joke|unacceptable)\b/],
];

export function classifyBaseline(input: { subject?: string; message: string; candidate_name?: string }): Classification {
  const text = `${input.subject ?? ""} ${input.message}`.toLowerCase();
  const hits = RULES.filter(([, re]) => re.test(text)).map(([id]) => id);
  const primary = hits[0] ?? "other_unclear";
  const raw = [input.candidate_name ?? "", input.subject ?? "", input.message].join("\n");
  const reasons = ATTENTION.filter(([, re]) => re.test(raw) || re.test(text)).map(([r]) => r);
  return {
    primary_intent: primary,
    secondary_intents: hits.slice(1),
    needs_attention: reasons.length > 0,
    attention_reasons: reasons,
    summary: "Deterministic keyword baseline — not an AI classification.",
  };
}
