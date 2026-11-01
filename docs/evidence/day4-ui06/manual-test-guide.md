# UI-06 — Owner manual accessibility test guide

**Purpose:** these checks could **not** be performed by Claude in this session. Record every result as an actual human observation, with your device and versions.

**Setup (simulated mode, no paid calls):** `npm run build && npx next start -p 3000 -H 127.0.0.1`, with `INBOX_PROCESSING_MODE` unset. Open http://127.0.0.1:3000.

Record your environment first:

```text
Tester:            _____     Date: _____
Mac model / macOS: _____     (Apple menu → About This Mac)
VoiceOver version: _____     (shipped with macOS; note the macOS build)
Browsers:          Safari ___  Firefox ___  Chrome ___
```

## 1. Keyboard only, in Safari and Firefox

These are needed because Claude ran Chromium only, and UX-A11Y-02 relies on `:has()`.

**Safari first:** enable *Settings → Advanced → "Press Tab to highlight each item on a webpage"*.

| # | Step | Expected | Safari | Firefox |
|---|---|---|---|---|
| 1.1 | Tab from the page top | The focus ring is visible on every stop; the "Choose local CSV" label is outlined when the hidden file input is focused | | |
| 1.2 | Tab to "Load 6-message sample", press Enter, then "Process 6 valid messages →", then "Reveal simulated AI results →" | Each activates; focus stays visible | | |
| 1.3 | Tab to the Ada Okafor row and press Enter; Tab into the draft editor and type | Editor ring visible; "Draft changed. Review pending." appears | | |
| 1.4 | Tab to "Approve draft" and press Space | "Draft approval recorded. No message was sent." | | |
| 1.5 | Tab to "Batch results" (nav), press Enter, then Tab to "Download CSV results" and press Enter | A CSV downloads | | |
| 1.6 | At each step | Focus never disappears, is never hidden behind other content, and Tab never gets stuck | | |
| 1.7 | Button/summary rings are dark indigo (`#4f46e5`); sidebar rings stay light (A11Y-04) | as stated | | |

## 2. Real browser zoom (1.4.4) and reflow (1.4.10)

| # | Step | Expected | Result |
|---|---|---|---|
| 2.1 | Window about 1280 px wide, **Cmd + until 200%** (Safari and Chrome) | All text is readable; nothing is cut off; no horizontal page scrolling except inside the preview table | |
| 2.2 | At 200%, repeat steps 1.2–1.5 | All controls are reachable and operable | |
| 2.3 | Zoom to 400% on a 1280 px window (about 320 CSS px) | Content reflows to one column; no two-dimensional scrolling | |

## 3. VoiceOver with Safari (screen reader, never yet tested)

Cmd+F5 toggles VoiceOver. VO = Ctrl+Option.

| # | Step | Expected announcement / behaviour | Result |
|---|---|---|---|
| 3.1 | VO+U → Landmarks | Navigation ("Application navigation", "Main views"), main, banner/header, contentinfo/footer | |
| 3.2 | VO+U → Headings | One h1 per view ("Import candidate messages" …) | |
| 3.3 | Tab through Import | Each field's label is read ("Message ID, required"?, "Candidate name", …); the file control is read as a file button with "Choose local CSV" | |
| 3.4 | Load the sample with errors | Invalid rows can be found and their error text is read | |
| 3.5 | Process → Reveal | The status "Processing … messages…" and the results message are announced without moving focus (polite) | |
| 3.6 | Select a message | The row is read with name, review status and attention badge | |
| 3.7 | Secondary-intent checkboxes | The group name is read ("Secondary intents"), then each checkbox with its state | |
| 3.8 | Approve / Reject | "Draft approval recorded. No message was sent." is announced | |
| 3.9 | Sarah James (blocked) | The blocked-draft warning is read; "Run limited mock check" is reachable; the recheck result is announced | |
| 3.10 | Fatima Yusuf (failed) → Retry | The retry outcome is announced ("Retry succeeded …") | |
| 3.11 | Icons (A11Y-08) | Note whether "exclamation mark", "black square", "sparkles" and similar are read | |
| 3.12 | "Review status" (A11Y-R1) | Note how it is read | |
| 3.13 | Results → Download CSV | The button name is read; the download is announced by Safari | |

## 4. Forced colours / high contrast

| # | Step | Expected | Result |
|---|---|---|---|
| 4.1 | macOS: System Settings → Accessibility → Display → Increase contrast | Controls and focus rings remain visible | |
| 4.2 | Windows (if available): Settings → Accessibility → Contrast themes, in Edge | Focus outlines are visible on every control; text is readable (Claude tested **emulated** `forced-colors` only: 38/38 stops kept an outline) | |

## 5. Visual acceptance decisions requested

- `UX-A11Y-04_PENDING_OWNER_VISUAL_ACCEPTANCE`: see `visual-exception-ux-a11y-04.md`.
- Whether to authorize A11Y-05 (checkbox ring), A11Y-06 (text tokens), A11Y-07 (field borders) and A11Y-08 (icon hiding): see `findings-register.md`.
