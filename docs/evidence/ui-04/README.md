# UI-04 parity evidence

Environment: macOS arm64, Playwright 1.64.1, Chromium headless shell 156.0.8078.4, deviceScaleFactor 1, full-page captures, scroll reset before capture. Raw numbers are in `parity-report.json`; sample app captures are in this folder.

## Gate: app vs the unchanged approved HTML, same steps, same browser
**173 of 173 cases at 0 differing pixels**, with identical page sizes and no horizontal overflow.

This includes 15 new UI-04 states at 1440/390/320/768:
- **Decisions:** approve first; reject first; Next pending after an approval; Approved filter then edit (→ Pending)
- **Classification:** M002 primary/secondary swap; M004 primary correction; adding a secondary
- **Draft:** empty draft
- **M003 blocker flow:** recheck with unchanged draft (fails, with an alert); edited (re-check notice); rechecked (corrected notice); approved; unsafe phrase reintroduced
- **Queue complete:** all pending reviewed; all reviewed with the "All" filter (1440 only, see below)

All UI-02/UI-03 states remain at 0 px.

## Design/correctness conflict found: owner decision requested
At ≤900 px, after the last Pending draft is approved or rejected, the approved prototype leaves the mobile detail open with an empty "Select a message" card:
- there is no "← All messages" button and the list is hidden;
- the nav buttons don't reset it;
- so the "All AI-completed messages reviewed" state is unreachable on mobile, and the user can only leave via Reset or another view that keeps the same dead end on return.

The app reproduces this exactly (`review-all-reviewed-390.app.png`; test "documents approved-design behavior…"), because changing it would be an unapproved design change.

Possible fixes, both needing approval:
- (a) show "← All messages" in the empty detail card;
- (b) close mobile detail automatically when no record remains selected.

Because of this, `review-all-reviewed-show-all` is captured at 1440 px only.

## Harness notes
- **Detail actions on mobile:** they are hidden until a message is opened, and filters are hidden while a detail is open. The first runs timed out on 27 cases for this reason. The steps now open Ada's detail first, or return to the list before changing a filter.
