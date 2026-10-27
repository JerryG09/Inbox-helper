# Claude Implementation Instruction — DAY1-01 / AI-Native Policy V1.1.1

Project: `JerryG09/Inbox-helper`
Challenge: MUST Option A — Candidate Inbox Helper
Current stage: Day 1, started 27 October 2026.

## Owner-approved scope

Implement `DAY1-01`: UI-00 engineering scaffold/reference integrity plus UI-01 application shell and responsive navigation. Carry over the exact approved Hi-fi V1.1 HTML/CSS structure and design tokens. Only this bounded slice is authorized now.

Use the attached unchanged `MUST-Inbox-Helper-HiFi-V1.1-APPROVED-REFERENCE-BUNDLE.zip` and the updated `UI Implementation Contract V1.1.1` as the source of truth. Zero unauthorized design drift. Use synthetic candidate data. Do not implement automatic sending, authentication, a new backend, or real-model workflows during this slice.

## Git operations — Claude is authorized

- Create a dedicated `day1/ui-foundation` feature branch from `main` (if main is unborn/empty, initialize the repository safely and explain the chosen first-commit/branch procedure).
- Implement locally and run real install/lint/typecheck/build, plus screenshot parity checks at approved widths as applicable.
- Commit **only the approved, tested work** to the feature branch and push that branch to `origin`.
- Preserve existing Git configuration and truthful author/committer metadata. No force-push or secret commits.
- Do **not** merge into main, deploy, or open a pull request unless the owner explicitly authorizes it.
- If out-of-scope changes or any design change become necessary, stop and ask for approval before committing/pushing them.

## Return an auditable post-push report

1. Feature branch name and exact remote URL.
2. Full pushed commit SHA(s) and commit link(s).
3. Changed/added file list, meaningful implementation summary, and whether it is truly in scope.
4. Commands executed, exact real outcomes, and failures.
5. Screenshot parity evidence against V1.1 and any unresolved mismatches.
6. Privacy and `.env`/secrets audit result.
7. AI-generated or AI-suggested work, independent human checks still required, and any proposed follow-up.
8. Clear verdict: `READY_FOR_INDEPENDENT_REVIEW` or `BLOCKED`.

This is an AI-native challenge. Record AI involvement truthfully in the daily log. Do not present simulation as real LLM processing. The owner controls merging, deployment, and final MUST submission.
