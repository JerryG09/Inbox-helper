# UI-03 parity evidence

Environment: macOS arm64, Playwright 1.64.1, Chromium headless shell 156.0.8078.4, deviceScaleFactor 1, full-page captures, with scroll reset to the top before each capture. Raw numbers are in `parity-report.json`; sample app captures are in this folder.

## Gate: app vs the unchanged approved HTML, same steps, same browser
**116 of 116 cases at 0 differing pixels** (29 states × 1440/390/320/768), with identical page sizes and no horizontal overflow.

States covered:
- **Inbox:** queued before reveal; revealed sample; multi-intent selection (M002); blocked selection (M003); review filter All; failed queue; failed detail (M005); attention-only; no-match empty state; Next pending; detail opened (Ada and Grace); back to list; a custom message reusing ID M001 (labelled fallback); after a failed import
- **Earlier slices:** the 14 UI-02 Import states and the two empty states, still at 0 px

This proves the populated screens look like the approved design. It does **not** prove the review controls work: editing, intent correction, approve/reject, the mock recheck and retry are display-only until UI-04/UI-05.

## Report only: app vs the frozen PNGs (captured on another machine)
| State | Frozen file | Size match | Differing pixels |
|---|---|---|---|
| Import empty 1440 | desktop/01 | yes | 2.52% |
| Import empty 390 | mobile/01 | yes | 4.15% |
| Inbox revealed 1440 | desktop/02 | yes | 4.39% |
| Inbox list 390 | mobile/02 | yes | 4.29% |
| Blocked draft 1440 | desktop/03 | yes | 2.41% |
| Blocked detail 390 | mobile/04 | yes | 4.82% |
| Ada detail 390 | mobile/03 | yes | 5.46% |
| Ada detail 768 | mobile/07 | yes | 3.15% |
| Ada detail 320 | mobile/06 | **no: 1962 vs 1932 px** | not computed |

**Unresolved:** 320 px detail is 30 px taller. Side-by-side crops show the same record, layout and controls. This machine's system font is wider, so one text line wraps once more at 320 px. The approved HTML grows by the same 30 px on this machine, which is why the same-browser gate is 0 px. This is attributed to font rasterization/metrics, but it is not zero, and the owner should confirm it by eye.

## Harness change during UI-03
Captures now reset scroll to the top. "Next pending" at 1440 px initially differed by 7,679 px, all inside the sticky sidebar. A probe showed the selection was identical in both pages (David Chen), but the scroll offset differed by 1 px (849 vs 850) after Playwright scrolled the button into view. Resetting scroll removes this capture artefact; page content is unaffected.
