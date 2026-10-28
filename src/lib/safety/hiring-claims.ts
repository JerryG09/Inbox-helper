// AI-01 R1: the ONE deterministic unsupported-hiring-claim detector, shared by the server-side provider check,
// canApprove() and recheckDraft() (via forbiddenDraft in ../inbox/inbox). It is a LIMITED safeguard: it detects
// common affirmative hiring, selection and offer claims; unknown phrasings remain a human-review responsibility.
//
// Method: each sentence is checked against affirmative-claim patterns. A match is ignored only when the sentence is
// a question, or when the same clause (text after the last , ; : or dash before the match) contains a negation or
// conditional cue before it — "We cannot confirm that you have been selected", "If you are selected, …".

const YOU = String.raw`(?:you|you've|you have|you are|you're|you were)`;
const CLAIMS: RegExp[] = [
  // Hired / employed
  new RegExp(String.raw`\b${YOU}\s+(?:now\s+)?(?:been\s+)?(?:officially\s+)?(?:hired|employed)\b`),
  /\b(?:decided|chosen|agreed)\s+to\s+(?:hire|employ)\s+you\b/,
  // Selected / shortlisted / successful
  new RegExp(String.raw`\b${YOU}\s+(?:now\s+)?(?:been\s+)?(?:successfully\s+)?(?:selected|shortlisted|chosen)\b`),
  new RegExp(String.raw`\b${YOU}\s+(?:been\s+)?successful\b`),
  /\byour\s+application\s+(?:has\s+been|was|is)\s+(?:accepted|successful|approved)\b/,
  /\byou(?:'ve|\s+have)?\s+got\s+the\s+(?:job|role|position)\b/,
  // Employer offering the position
  /\b(?:pleased|delighted|happy|thrilled|excited|glad)\s+to\s+(?:offer|extend)\b/,
  /\b(?:we'd|we\s+would|we)\s+(?:like|love|want)\s+to\s+(?:offer|extend)\b/,
  /\b(?:we\s+are|we're|we\s+will\s+be)\s+(?:offering|extending)\s+(?:you|an\s+offer)\b/,
  /\b(?:we\s+have|we've|we)\s+(?:made|extended|sent|issued)\s+(?:you\s+)?(?:an?|your|the)\s+offer\b/,
  /\boffer\s+of\s+employment\b/,
  // Offer made, confirmed, prepared or issued; offer letter
  /\b(?:your|an|the)\s+offer(?:\s+letter)?\s+(?:has\s+been|is\s+being|is|was|will\s+be)\s+(?:made|confirmed|approved|prepared|issued|sent|finali[sz]ed|ready|on\s+its\s+way)\b/,
  /\boffer\s+letter\s+is\s+(?:being\s+prepared|on\s+its\s+way)\b/,
  /\b(?:preparing|issuing|sending)\s+(?:you\s+)?(?:your|an|the)\s+offer\b/,
  // Onboarding implied
  /\bwelcome\s+(?:to\s+the\s+team|aboard)\b/,
  /\byour\s+start\s+date\s+(?:is|will\s+be)\b/,
  // Unsupported rejection decisions (V1.1/AI-01 list, retained)
  /\byou\s+have\s+not\s+been\s+successful\b/,
  /\byou\s+have\s+been\s+unsuccessful\b/,
];

// Negation / uncertainty / conditional cues that make a following match non-affirmative within the same clause.
const HEDGE = /\b(?:not|no|never|cannot|can't|cant|won't|unable|if|once|whether|when|until|unless|may|might|could|should)\b|n't\b/;

const normalise = (v: string) => v.toLowerCase().replace(/[‘’ʼ]/g, "'");

export function containsHiringClaim(text: string): boolean {
  for (const sentence of normalise(text).match(/[^.!?\n]+[.!?]*/g) ?? []) {
    if (sentence.trim().endsWith("?")) continue;
    for (const re of CLAIMS) {
      const m = re.exec(sentence);
      if (!m) continue;
      const before = sentence.slice(0, m.index);
      const clause = before.slice(Math.max(before.lastIndexOf(","), before.lastIndexOf(";"), before.lastIndexOf(":"), before.lastIndexOf("—"), before.lastIndexOf(" - ")) + 1);
      if (!HEDGE.test(clause)) return true;
    }
  }
  return false;
}
