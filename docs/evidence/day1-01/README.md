# DAY1-01 parity evidence

Environment: macOS (Darwin 25.6.0, arm64), Playwright 1.64.1, Chromium headless shell 156.0.8078.4, deviceScaleFactor 1, full-page captures. Raw numbers: `parity-report.json`.

| State | Width | App vs approved HTML (same browser) | App vs frozen PNG | Horizontal overflow |
|---|---|---|---|---|
| Import empty | 1440 | 0 px | 1440×900 both; 32,595 px (2.515%) | 0 |
| Import empty | 390 | 0 px | 390×1660 both; 26,835 px (4.145%) | 0 |
| Import empty | 320 | 0 px | no frozen image for this state | 0 |
| Import empty | 768 | 0 px | no frozen image for this state | 0 |
| Inbox empty | 1440 / 390 | 0 px / 0 px | no frozen image for this state | 0 / 0 |
| Results empty | 1440 / 390 | 0 px / 0 px | no frozen image for this state | 0 / 0 |

## Unresolved: difference against frozen PNGs
The frozen PNGs were captured on a machine whose system font renders differently from this Mac's `-apple-system` (SF Pro). The diff images (`*.diff-vs-frozen.png`) show differences only on text glyphs and on the outline of buttons whose width follows text width. Page dimensions, panel geometry, colors and spacing match. Because the unchanged approved HTML produces identical pixels to the app on this machine, the residual is attributable to font rasterization (contract §1), not to design drift — but it is **not** zero, and the owner should confirm by eye or re-run `npm run test:visual` on the reference capture machine.
