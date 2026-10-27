// SIMULATED processor — deterministic, no network, no model. Port of initialOutcome() in the approved V1.1 prototype.
// Canned outcomes bind only to an EXACT synthetic fixture (id, name, subject and message all equal), never to the id alone.
import type { IntentId } from "../domain/intents";
import type { ValidMessage } from "../domain/types";
import { SAMPLE_ROWS } from "../import/sample";
import type { ProcessBatch, ProcessOutcome } from "./processor";

type Canned = Omit<Extract<ProcessOutcome, { ok: true }>, "key" | "source"> | { ok: false; code: string; description: string };

const FIXTURE_OUTCOMES: Record<string, Canned> = {
  M001: { ok: true, primaryIntent: "interview_scheduling", secondaryIntents: [], summary: "Candidate asks to change interview time.", attentionReasons: ["Interview availability not verified"], blocked: false, draft: "Hi Ada, thanks for letting us know. Could you share some alternative times? We will check availability and get back to you." },
  M002: { ok: true, primaryIntent: "interview_scheduling", secondaryIntents: ["documentation_technical"], summary: "Broken meeting link and request to reschedule.", attentionReasons: ["Multiple requests", "Interview availability not verified"], blocked: false, draft: "Hi David, thanks for flagging the broken link and scheduling conflict. We will review the link issue and check whether Friday is available." },
  M003: { ok: true, primaryIntent: "application_status", secondaryIntents: [], summary: "Candidate asks about a hiring decision.", attentionReasons: ["Unsupported hiring decision"], blocked: true, draft: "Congratulations! You have been hired and your offer letter is being prepared." },
  M004: { ok: true, primaryIntent: "application_status", secondaryIntents: [], summary: "Candidate requests application update.", attentionReasons: [], blocked: false, draft: "Hi Grace, thank you for following up. We will pass your enquiry to the recruitment team for an update." },
  M005: { ok: false, code: "simulated_timeout", description: "Simulated AI provider timeout" },
  M006: { ok: true, primaryIntent: "withdrawal", secondaryIntents: [], summary: "Candidate requests withdrawal.", attentionReasons: [], blocked: false, draft: "Hi Chidi, thank you for letting us know. We will pass your withdrawal request to the recruitment team." },
};

export function exactFixtureId(m: ValidMessage): string | undefined {
  return SAMPLE_ROWS.find(
    (f) => f.id === m.importedId && f.candidate_name === (m.candidateName ?? "") && f.subject === (m.subject ?? "") && f.message === m.message,
  )?.id;
}

// Rule-based placeholder for arbitrary input. Labelled as NOT AI in its summary, as in the approved prototype.
function fallbackIntent(m: ValidMessage): IntentId {
  const txt = `${m.subject ?? ""} ${m.message}`.toLowerCase();
  if (/\bwithdraw|withdrawal|remove my application/.test(txt)) return "withdrawal";
  if (/interview|reschedul|appointment/.test(txt)) return "interview_scheduling";
  if (/cv|resume|upload|broken link|technical/.test(txt)) return "documentation_technical";
  if (/apply|application|status|hired/.test(txt)) return "application_status";
  if (/remote|salary|role|job/.test(txt)) return "job_information";
  return "other_unclear";
}

export function simulateOutcome(m: ValidMessage): ProcessOutcome {
  const fixtureId = exactFixtureId(m);
  if (fixtureId) return { key: m.key, source: "simulated_fixture", ...FIXTURE_OUTCOMES[fixtureId]! } as ProcessOutcome;
  return {
    key: m.key,
    ok: true,
    source: "simulated_fallback",
    primaryIntent: fallbackIntent(m),
    secondaryIntents: [],
    summary: "Rule-based placeholder for arbitrary input — NOT an AI-generated classification.",
    draft: "Hello, thanks for your message. We will review your enquiry and respond with relevant information.",
    attentionReasons: ["Generic simulated response — check relevance"],
    blocked: false,
  };
}

export const simulateBatch: ProcessBatch = async (messages) => messages.map(simulateOutcome);
