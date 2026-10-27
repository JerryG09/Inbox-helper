# Label adjudication: dataset v0.1 → proposed v0.2

**Date:** 27 October 2026 (DAY1-02 R1).
**Status:** proposed by Claude Code. **Not owner-confirmed.** `eval/dataset/v0.1.json` stays unchanged as the historical initial-label version. The proposal is in `eval/dataset/v0.2.json` (`label_status: proposed_v0.2_pending_owner_review`).

**Scope:** the six items flagged in independent review of run `2026-10-27T09-27-47-053Z-llm.json` (`claude-haiku-5-5`, prompt `classify-v1`).

**Method:** for each item I re-read the synthetic message against the intent definitions in `src/lib/domain/intents.ts`, then compared that reading with the v0.1 label and the model's raw output. The question was whether the label or the model is wrong. A disagreement is not automatically a model error.

**New field:** v0.2 adds `acceptable_primary`, a list of other primaries a reviewer accepts as equally correct. It is used only where the message genuinely supports more than one first action.

| ID | Message (synthetic) | v0.1 label | Model output | Finding | Proposed v0.2 |
|---|---|---|---|---|---|
| E014 | "Is Thursday still okay?" | `interview_scheduling` · no attention | `interview_scheduling` · no attention | The model matched v0.1. The label assumes outside context: nothing in the text says the message is about an interview. `other_unclear` is equally defensible. | primary `interview_scheduling`; **acceptable `other_unclear`**; attention unchanged (`false`). |
| E016 | "Did you get my CV?" | `application_status` + secondary `documentation_technical` | `application_status`, no secondary | **The label over-specified.** The candidate asks whether a document was received. They report no upload problem and ask which documents are needed. The secondary is not supported by the text. | secondary **removed** (`[]`). |
| E017 | "Can I put my application on hold for a month while I relocate?" | `other_unclear` + secondary `application_status` · attention | **Truncated** at max_tokens 400. Partial output had primary `withdrawal`, attention `true`. | Pausing is not withdrawing. Treating it as `withdrawal` risks dropping a candidate who wants to stay, so the v0.1 primary stands. The `application_status` secondary is not supported: the candidate isn't asking where the application stands. **The partial output is not scored as a decision** (see scoring v2). | primary `other_unclear` (unchanged); secondary **removed**; attention `true` (unchanged). |
| E019 | "The video link in my invite doesn't open, and could we also start 30 minutes later?" | `interview_scheduling` + `documentation_technical` | `documentation_technical` + `interview_scheduling` | Both intents were found, in swapped order. Neither need is clearly first, so a strict primary-only score penalised a reasonable answer. | primary `interview_scheduling`; **acceptable `documentation_technical`**; both intents still expected. |
| E020 | "Before my interview on Friday, can you tell me whether the role includes travel?" | `job_information` + secondary `interview_scheduling` | `job_information`, no secondary | **The label over-specified.** The interview is context only; the candidate doesn't ask to book, move or confirm it. | secondary **removed** (`[]`). |
| E028 | "This process is a joke. If nobody replies by tomorrow I'll post about your company everywhere." | `application_status` · attention | **Truncated** at max_tokens 400. Partial output had primary `other_unclear` + secondary `application_status`, attention `true`. | No explicit request is stated; the candidate only implies they want a status reply. `other_unclear` is equally defensible. Attention is clearly required. The partial output is not scored as a decision. | primary `application_status`; **acceptable `other_unclear`**; attention `true` (unchanged). |

## Effect on model scores

- **Moves toward the model:** E016, E019 and E020 now count as correct, because the labels change. That is a label correction, not a model improvement, and it should be reported as such.
- **No change:** E014 was already correct.
- **Not counted as completed decisions:** E017 and E028. Under scoring v2 a truncated response is counted as truncated, and its attention outcome is unassessable.

## Owner decision required

Accept, amend or reject each row. Then set `label_status` to `owner_confirmed`, or record the amendments. Until then, no score against v0.1 or v0.2 may be reported as measured against human labels.
