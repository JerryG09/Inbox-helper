# EVAL-04B structural validator. Enforces the owner-approved table (re-typed here from the directive, independent of the
# frozen file) against eval/heldout/day4-candidate-messages-v1.0.json. No model, no scoring, no network.
# Usage: python3 -I docs/evidence/day4-eval04b/validate-freeze.py [frozen.json]   (run from repo root; exit 0 = PASS)
import hashlib, json, sys
SRC, SRC_SHA = "eval/heldout/day4-candidate-messages-v1.json", "44c5c904f028255515c76b851297bde72b457314aba0c3af1a6996b2a4da68ac"
FROZEN = sys.argv[1] if len(sys.argv) > 1 else "eval/heldout/day4-candidate-messages-v1.0.json"
C = dict(AS="application_status", IS="interview_scheduling", JI="job_information", DT="documentation_technical", WD="withdrawal", OU="other_unclear")
# id: (primary, secondary, attention, alternatives)
OWNER = {
 "H001":("AS","","N",""),"H002":("AS","","N",""),"H003":("AS","IS","N","IS"),"H004":("JI","","N","AS"),"H005":("AS","","Y",""),
 "H006":("IS","","N",""),"H007":("IS","DT","Y","DT"),"H008":("IS","WD","Y",""),"H009":("DT","IS","N","IS"),"H010":("IS","","Y",""),
 "H011":("JI","","N",""),"H012":("JI","IS","N","IS"),"H013":("JI","","N",""),"H014":("JI","AS","N","AS"),"H015":("JI","","Y",""),
 "H016":("DT","","N",""),"H017":("DT","AS","N",""),"H018":("DT","","N",""),"H019":("DT","","Y",""),"H020":("DT","","N",""),
 "H021":("WD","","N",""),"H022":("AS","WD","Y","WD"),"H023":("WD","","Y",""),"H024":("WD","IS","N",""),"H025":("OU","","Y",""),
 "H026":("OU","","Y","JI"),"H027":("OU","","N",""),"H028":("OU","","Y",""),"H029":("OU","","N",""),"H030":("OU","","Y",""),
}
CORRECTED = {"H004","H007","H009","H013","H020","H022","H025","H026","H030"}
REASON_PREFIX = {"H007": "The calendar invitation displays 3 a.m. in Lagos.", "H025": "The candidate contradicts the withdrawal instruction",
                 "H026": "Verify applicable recruitment eligibility and organizational policy"}
fails = []
def check(cond, msg):
    if not cond: fails.append(msg)

raw_src = open(SRC, "rb").read()
check(hashlib.sha256(raw_src).hexdigest() == SRC_SHA, "source draft SHA-256 changed")
src = json.loads(raw_src)
check(src["freeze_status"] == "NOT_FROZEN" and src["model_runs"] == [], "source draft status changed")
check(all(i["label_status"] == "AI_PROPOSED_UNVERIFIED" for i in src["items"]), "source draft label status changed")
raw = open(FROZEN, "rb").read()
f = json.loads(raw)
check(json.dumps(f, indent=2, ensure_ascii=False).encode() + b"\n" == raw, "frozen JSON does not reserialize deterministically")
check(f["version"] == "1.0" and f["freeze_status"] == "FROZEN" and f["label_status"] == "owner_confirmed", "top-level status")
check(f["source_draft"]["sha256"] == SRC_SHA and f["source_draft"]["path"] == SRC, "source_draft reference")
check(f["record_count"] == 30 and len(f["items"]) == 30, "record count")
check([i["id"] for i in f["items"]] == [f"H{n:03d}" for n in range(1, 31)], "ids not exactly H001..H030 in order")
check(f["intents"] == list(C.values()), "taxonomy")
check(f["label_provenance"]["blind"] is False and "derived from AI-proposed labels" in f["label_provenance"]["description"], "provenance wording")
banned = {"model_runs", "predictions", "runs", "results", "score", "outputs"}
check(not banned & set(f), "top-level contains model-output fields")
srcById = {i["id"]: i for i in src["items"]}
for it in f["items"]:
    k = it["id"]; s = srcById[k]; L = it.get("reference_label", {})
    check(set(it) == {"id","candidate_name","role_applied","subject","message","reference_label"}, f"{k}: unexpected item fields {sorted(set(it))}")
    for fld in ("candidate_name","role_applied","subject","message"): check(it[fld] == s[fld], f"{k}: {fld} differs from draft")
    p, sec, att, alt = OWNER[k]
    exp = dict(primary_intent=C[p], secondary_intents=[C[x] for x in sec.split(",") if x], needs_attention=att == "Y",
               acceptable_alternative_primary=[C[x] for x in alt.split(",") if x])
    for fld, v in exp.items(): check(L.get(fld) == v, f"{k}: {fld} = {L.get(fld)!r}, owner table says {v!r}")
    check(L.get("label_status") == "owner_confirmed", f"{k}: label_status")
    for fld in ("primary_intent",): check(L.get(fld) in C.values(), f"{k}: primary outside taxonomy")
    check(all(x in C.values() for x in L.get("secondary_intents", []) + L.get("acceptable_alternative_primary", [])), f"{k}: intent outside taxonomy")
    check(L.get("primary_intent") not in L.get("secondary_intents", []), f"{k}: secondary repeats primary")
    check(len(set(L.get("secondary_intents", []))) == len(L.get("secondary_intents", [])), f"{k}: duplicate secondary")
    check(L.get("primary_intent") not in L.get("acceptable_alternative_primary", []), f"{k}: alternative repeats primary")
    check(bool(L.get("attention_reasons")) == L.get("needs_attention"), f"{k}: attention reasons disagree with boolean")
    if k in REASON_PREFIX: check(len(L["attention_reasons"]) == 1 and L["attention_reasons"][0].startswith(REASON_PREFIX[k]), f"{k}: owner attention reason")
    elif L.get("needs_attention"): check(L["attention_reasons"] == s["proposed_attention_reasons"], f"{k}: attention reasons differ from original proposal")
    proposal = dict(primary_intent=s["proposed_primary"], secondary_intents=s["proposed_secondary"], needs_attention=s["proposed_attention"],
                    acceptable_alternative_primary=s["acceptable_alternative_primary"])
    same = all(L.get(x) == v for x, v in proposal.items())
    check(same == (k not in CORRECTED), f"{k}: {'unchanged but listed as corrected' if same else 'changed but not an approved correction'}")
labs = [i["reference_label"] for i in f["items"]]
dist = {c: sum(l["primary_intent"] == C[c] for l in labs) for c in C}
check(dist == dict(AS=5, IS=4, JI=6, DT=6, WD=3, OU=6), f"primary distribution {dist}")
check(sum(bool(l["secondary_intents"]) for l in labs) == 9, "multi-intent count != 9")
check(sum(l["needs_attention"] for l in labs) == 12, "attention count != 12")
check(sum(bool(l["acceptable_alternative_primary"]) for l in labs) == 8, "alternatives count != 8")
check(sum(l["label_status"] == "owner_confirmed" for l in labs) == 30, "owner-confirmed != 30")
print(json.dumps({"frozen": FROZEN, "sha256": hashlib.sha256(raw).hexdigest(), "primary": dist, "fails": fails}, indent=1))
print("PASS" if not fails else f"FAIL ({len(fails)})"); sys.exit(1 if fails else 0)
