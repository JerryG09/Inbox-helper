# EVAL-04B — Owner label freeze manifest (Day 4)

**Status:** `DAY4_EVAL04B_OWNER_LABEL_FREEZE_READY_FOR_ARCHITECT_REVIEW`. Freeze only: **no model inference, no paid call, no baseline scoring.**

## 1. Files and hashes

| | Path | SHA-256 |
|---|---|---|
| Source draft (unchanged, still `NOT_FROZEN`) | `eval/heldout/day4-candidate-messages-v1.json` | `44c5c904f028255515c76b851297bde72b457314aba0c3af1a6996b2a4da68ac` |
| **Frozen reference v1.0** | `eval/heldout/day4-candidate-messages-v1.0.json` | `646128933def19264ef6228bb944083de59e6e2bc4470ef077537d53b674d412` |
| Structural validator | `docs/evidence/day4-eval04b/validate-freeze.py` | (evidence script; not product code) |

- **Git parent:** `1991ec0430917f98792726ae6bd7ff4da6fbde9b` (`main`).
- **Branch:** `day4/eval04b-owner-label-freeze`.
- **Freeze commit:** reported in the EVAL-04B completion message. It is not embedded here, because embedding it would need a second, self-referential commit.

## 2. Schema and status

- **Top level:**
  - `dataset`, `version: "1.0"`
  - `source_draft {path, sha256, version, label_status}`
  - `freeze_status: "FROZEN"`, `label_status: "owner_confirmed"`
  - `frozen_at: 2026-10-30T10:13:20+01:00` (WAT)
  - `label_provenance`, `synthetic: true`, `notes`
  - `intents` (the six locked ids), `record_count: 30`, `items`
- **Each item:** the candidate input fields copied verbatim from the draft (`id`, `candidate_name`, `role_applied`, `subject`, `message`), plus a separate `reference_label` object:
  - `primary_intent`, `secondary_intents`
  - `needs_attention`, `attention_reasons`
  - `acceptable_alternative_primary`
  - `label_status: "owner_confirmed"`
- **Not copied:**
  - Claude's original `proposed_*` fields, rationale, ambiguity notes and tags. They remain only in the immutable draft.
  - Any model run, prediction or score.

## 3. Owner decision

- **Date:** Friday 30 October 2026 (WAT). The owner reviewed all 30 messages together with Claude's proposed labels.
- **Result:** 30/30 confirmed. 21 unchanged; 9 corrected.

**Provenance:** owner-adjudicated reference labels derived from AI-proposed labels. They are human-approved but **not blind**: the owner saw Claude's proposals while reviewing.

### The nine corrections (draft proposal → owner reference)

| ID | Primary | Secondary | Attention | Acceptable alternative |
|---|---|---|---|---|
| H004 | AS → **JI** | [JI] → **—** | no | [JI] → **[AS]** |
| H007 | IS | [DT] | no → **yes** (new reason) | [DT] |
| H009 | IS → **DT** | [DT] → **[IS]** | no | — → **[IS]** |
| H013 | JI | — | no | [OU] → **—** |
| H020 | DT | [IS] → **—** | no | [IS] → **—** |
| H022 | WD → **AS** | [AS] → **[WD]** | yes (reason kept) | [AS] → **[WD]** |
| H025 | WD → **OU** | — | yes (**reason replaced**) | [AS, OU] → **—** |
| H026 | OU | — | no → **yes** (new reason) | [JI] |
| H030 | OU | [JI] → **—** | yes (reason kept) | [JI] → **—** |

**Owner attention reasons, recorded verbatim:**
- **H007:** "The calendar invitation displays 3 a.m. in Lagos. Verify the actual interview time and timezone before confirming or resending the invitation. Do not invent the correct time."
- **H025:** "The candidate contradicts the withdrawal instruction and is uncertain about pausing. Obtain clarification before treating either action as authorized."
- **H026:** "Verify applicable recruitment eligibility and organizational policy for an enquiry on behalf of a 16-year-old. Do not presume age alone makes the candidate ineligible."

**The other 21 records are unchanged.** Their primary, secondary, attention flag, attention reasons and alternatives equal Claude's original proposals, and the validator enforces this.

**H019** is a synthetic privacy-handling scenario. The message reads "[details removed]" and contains no real passport or bank data.

## 4. Distribution after adjudication

| Metric | Count |
|---|---:|
| Primary: application_status / interview_scheduling / job_information / documentation_technical / withdrawal / other_unclear | 5 / 4 / 6 / 6 / 3 / 6 |
| Multi-intent records (non-empty secondary) | 9 |
| Attention-positive records | 12 |
| Records with an acceptable alternative primary | 8 |
| Owner-confirmed labels | 30 / 30 |

The categories are deliberately unbalanced. The draft's five-per-category balance was not restored.

## 5. Validation (2026-10-30, `python3 -I docs/evidence/day4-eval04b/validate-freeze.py`)

The validator types the owner table in again, independently of the builder. It does not compare the frozen file with itself. Result: **PASS** (exit 0, 0 failures).

What it checks:
- 30 unique ids, H001–H030.
- Candidate fields equal the draft's.
- Intents are within the six-id taxonomy.
- No secondary intent repeats the primary; no duplicate secondaries; no alternative equals the primary.
- `attention_reasons` is non-empty exactly when `needs_attention` is true.
- 30/30 records are owner-confirmed, and the top level is FROZEN.
- The distribution matches §4.
- Exactly the nine listed ids differ from the proposals, and the other 21 equal them.
- The source draft hash is unchanged and still `NOT_FROZEN`, with `model_runs: []`.
- The file reserializes byte-identically (`json.dumps(indent=2, ensure_ascii=False)` + LF).
- There are no model-output fields.

### Mutation-sensitive checks (on disposable copies in the session scratchpad, since deleted)

| Mutation | Validator | Failures reported |
|---|---|---|
| H025 primary → withdrawal | **FAIL**, exit 1 | H025 primary ≠ owner table; primary distribution |
| H007 attention removed | **FAIL**, exit 1 | H007 needs_attention, owner reason, "unchanged but listed as corrected", attention count |
| H022 reverted to withdrawal primary | **FAIL**, exit 1 | H022 primary/secondary/alternatives, "unchanged but listed as corrected", distribution |

After the mutations, the frozen file still hashes to `646128933def…d412`.

## 6. Prohibition on retroactive edits

- `eval/heldout/day4-candidate-messages-v1.0.json` is immutable once committed.
- A correction requires a new version (e.g. `v1.1`) with its own owner decision, hash and manifest. Do not edit v1.0 in place.
- Labels must not be changed after a model or baseline result has been seen.

## 7. Evaluation input isolation (requirement for the future adapter; not run here)

- A model request may receive only the candidate input fields that the production route `POST /api/process` accepts: `candidateName` ← `candidate_name`, `subject`, `message`, plus internal `key` and `importedId` ← `id`.
- The adapter must build each request by **explicitly selecting** these fields. It must never serialise a whole item.
- It must never send `reference_label` or any part of it (primary, secondary, attention, reasons, alternatives), nor any draft-file field (`proposed_*`, rationale, ambiguity notes, tags).
- `role_applied` is not part of the current route's schema and is therefore not sent.
- The adapter must have a test asserting that no label value reaches the provider request.

## 8. Limitations

- Claude wrote the messages and the original proposals. The owner adjudicated with the proposals visible (not blind), and there is one adjudicator, so inter-rater agreement is unmeasured.
- n = 30 supports a descriptive evaluation only.
- All data is synthetic.
- This freeze authorises neither baseline scoring nor model evaluation. Both need separate approval after independent architect review.
