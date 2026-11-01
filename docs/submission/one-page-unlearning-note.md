# One-page unlearning note — Candidate Inbox Helper

**MUST Unlearn · Use · Raise the Load | Final, 1 November 2026**
*Finalised from the Day 4 draft for submission. No engineering happened after 30 October, so the lessons are unchanged; the SAFE-04 fix and the UI-06C visual approval are still open.*

## What I had to unlearn

I started with an engineering instinct: match the approved design, get a high model accuracy score, and treat green tests as proof that the product is reliable. Building Candidate Inbox Helper challenged all three assumptions.

**First, matching the reference is not the same as serving the user.** An exact mobile replica could leave someone trapped in a detail pane; later, the visually approved design itself had low-contrast text, focus rings and field boundaries. I learned to preserve the original design as evidence while making narrowly scoped, owner-approved accessibility changes. A visual exception should be explained with measurements and controlled before/after comparisons—not hidden by widening a screenshot threshold.

**Second, a number can be accurate yet misleading.** Early model calls failed because of unsupported API parameters, not because the AI classified badly. Two truncated outputs were initially counted as missed attention flags. We corrected the scoring process and kept the original failures. For Day 4, I had 30 synthetic messages reviewed and nine proposed labels corrected *before* freezing the benchmark. The genuine Haiku 5.5 first pass then scored 25/30 strict primary intents versus 13/30 for the deterministic baseline. Those are descriptive results, not a claim of general reliability.

**Third, good classification does not make a generated reply truthful.** Although all 30 genuine responses completed, eleven drafts claimed the enquiry had already been passed to the recruitment team. No such handoff existed in the product. Another draft treated a withdrawal that had been retracted as still active. These findings were more important than the headline 83.3% accuracy. The product therefore keeps drafts in human review and never sends them automatically; the new safeguards remain separate, pending implementation and independent testing.

**Fourth, AI-assisted work only counts if a human can show ownership of it.** Claude Code wrote most of the code and evidence, but I adjudicated all 30 held-out labels (nine corrections) before freezing them, authorized every paid call, and accepted or held back each visual exception myself. The newest contrast fixes stay unmerged because I have not yet approved them visually, even though that leaves the submitted `main` with known contrast gaps.

## What I used, and how I raised the load

I used Claude Code for bounded implementation, tests and evidence gathering; ChatGPT for independent architectural scrutiny; and my own decisions for label adjudication, scope and visual acceptance. We used deterministic baselines, genuine but capped model calls, fake-provider boundary tests, mutation testing, Git commit provenance, visual controls and explicit stop gates.

The meaningful shift was from **“AI produced an answer”** to **“I can show what the AI did, how it was tested, what failed, what a human approved, and what is still unknown.”** I will carry that discipline into the final submission: no invented safety claims, no confusing simulated evidence with real model output, and no hiding the remaining accessibility and workflow risks.
