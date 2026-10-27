# UI-02 parity evidence

Environment: macOS arm64, Playwright 1.64.1, Chromium headless shell 156.0.8078.4, deviceScaleFactor 1, full-page captures. Raw numbers are in `parity-report.json`; sample app captures are in this folder.

**Gate:** the app compared with the unchanged approved HTML. Both are driven through the same user steps in the same browser at 1440, 390, 320 and 768 px.

**Result:** all 56 cases (14 states × 4 widths) show **0 differing pixels** and identical page sizes. None has horizontal overflow.

States covered:
- empty
- sample preview
- invalid-sample preview
- CSV previews: mixed and valid
- parse errors: malformed, missing column, empty file
- manual entry: valid and invalid
- processing: queued, and cancelled
- Inbox empty and Results empty

**Frozen PNGs:** they exist only for the empty Import state. The residual is unchanged from DAY1-01: 2.515% at 1440 and 4.145% at 390, from font rasterization (see `docs/evidence/day1-01/README.md`).

**Defect found and fixed during UI-02:** the first run showed 4–58 px differences in 46 of the 56 cases. Cause: React split strings such as `Process {n} valid messages →` into several text nodes, and Chromium shapes each node separately, which moved glyphs by about 1 px. Rendering each mixed string as a single text node brought every case to 0 px.
