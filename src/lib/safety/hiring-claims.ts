// AI-01 R1: the ONE deterministic unsupported-hiring-claim detector, shared by the server-side provider check,
// canApprove() and recheckDraft() (via forbiddenDraft in ../inbox/inbox). It is a LIMITED safeguard: it detects
// common affirmative hiring, selection and offer claims; unknown phrasings remain a human-review responsibility.
//
// Method: each sentence is checked against affirmative-claim patterns, and EVERY occurrence of each pattern is
// evaluated (R2). An occurrence is ignored only when its own clause (text after the last , ; : or dash before it)
// contains a negation or conditional cue before it — "We cannot confirm that you have been selected", "If you are
// selected, …" — or when it sits in the final clause of a sentence ending in "?" ("Were you selected?"). A claim
// followed by a separate tag clause ("You have been selected, okay?") is still declarative. "not only" is an
// intensifier, not a negation (R2).

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
const NOT_ONLY = /\bnot\s+only\b/g;
const lastBoundary = (s: string) => Math.max(s.lastIndexOf(","), s.lastIndexOf(";"), s.lastIndexOf(":"), s.lastIndexOf("—"), s.lastIndexOf(" - "));
const GLOBAL_CLAIMS = CLAIMS.map((re) => new RegExp(re.source, "g"));

export function containsHiringClaim(text: string): boolean {
  for (const sentence of normalise(text).match(/[^.!?\n]+[.!?]*/g) ?? []) {
    const question = sentence.trim().endsWith("?");
    for (const re of GLOBAL_CLAIMS) {
      for (const m of sentence.matchAll(re)) {
        const before = sentence.slice(0, m.index);
        const clause = before.slice(lastBoundary(before) + 1).replace(NOT_ONLY, "");
        if (HEDGE.test(clause)) continue;
        // Interrogative only when no clause boundary separates the claim from the closing "?".
        if (question && lastBoundary(sentence.slice(m.index + m[0].length)) === -1) continue;
        return true;
      }
    }
  }
  return false;
}
