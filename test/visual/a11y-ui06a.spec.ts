// UI-06A: keyboard-focus visibility (UX-A11Y-01/02) and secondary-intent group semantics (UX-A11Y-03), simulated mode.
// Focus is reached with real Tab / Shift+Tab key presses. Automated checks only — no screen reader, not a WCAG claim.
// UI06A_STAGE=before|after additionally writes measurements and screenshots to docs/evidence/day3-ui06a/ (evidence runs).
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";

const STAGE = process.env.UI06A_STAGE;
const OUT = "docs/evidence/day3-ui06a";
const FOCUS = "rgb(79, 70, 229)"; // #4f46e5
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
// Reach `selector` by keyboard: focus it, step away with Shift+Tab, come back with Tab (keyboard-modality focus).
async function keyboardFocus(page: Page, selector: string) {
  await page.locator(selector).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(selector)).toBeFocused();
}
// Computed indicator on `target` (the focused element, or the CSV label) plus clipping by any overflow ancestor.
const measure = (page: Page, target: string) => page.locator(target).evaluate((el) => {
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const ow = parseFloat(s.outlineWidth) || 0, off = parseFloat(s.outlineOffset) || 0, pad = s.outlineStyle === "none" ? 0 : ow + off;
  let clipped = false;
  for (let a = el.parentElement; a; a = a.parentElement) {
    const as = getComputedStyle(a);
    if (/(hidden|auto|scroll|clip)/.test(as.overflowX + as.overflowY)) {
      const b = a.getBoundingClientRect();
      if (r.left - pad < b.left || r.right + pad > b.right || r.top - pad < b.top || r.bottom + pad > b.bottom) clipped = true;
    }
  }
  let bg = "rgba(0, 0, 0, 0)";
  for (let a: Element | null = el.parentElement; a && /rgba\(0, 0, 0, 0\)|transparent/.test(bg); a = a.parentElement) bg = getComputedStyle(a).backgroundColor;
  return {
    active: (document.activeElement as HTMLElement).id, outline: { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset },
    boxShadow: s.boxShadow, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, rect: [r.x, r.y, r.width, r.height].map(Math.round),
    adjacentBackground: bg, clippedByOverflowAncestor: clipped,
  };
});

const IMPORT_FIELDS = ["#manual-id", "#manual-name", "#manual-subject", "#manual-message"];
const REVIEW_FIELDS = ["#primaryIntent", "#draftEditor", "#processFilterSelect", "#reviewFilterSelect"];
// One JSON line per measurement, written immediately (a failing test restarts the worker and would lose module state).
const record = (key: string, value: unknown) => { if (STAGE) { mkdirSync(OUT, { recursive: true }); appendFileSync(`${OUT}/focus-measurements-${STAGE}.jsonl`, JSON.stringify({ key, value }) + "\n"); } };

for (const [w, h] of [[1440, 900], [1280, 720], [390, 844], [320, 700]] as const) {
  test(`@${w}: CSV control shows a visible focus ring on its label while the hidden input has keyboard focus`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const unfocused = await measure(page, 'label[for="csvFile"]');
    await btn(page, "Load 6-message sample").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#csvFile")).toBeFocused();
    const focused = await measure(page, 'label[for="csvFile"]');
    record(`csv@${w}`, { unfocused, focused });
    if (STAGE && (w === 1440 || w === 390)) {
      await page.locator('label[for="csvFile"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/screenshots/${STAGE}-csv-focus-${w}.png`, animations: "disabled" });
    }
    if (STAGE === "before") return;
    expect(unfocused.outline.style).toBe("none");
    expect(focused).toMatchObject({ active: "csvFile", outline: { style: "solid", width: "3px", color: FOCUS }, clippedByOverflowAncestor: false });
    expect(focused.rect[2]).toBeGreaterThan(80); // the indicator is on the visible control, not the 1x1 input
  });

  test(`@${w}: form fields and draft editor show a 3px #4f46e5 outline on keyboard focus only`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const results: Record<string, unknown> = {};
    for (const sel of IMPORT_FIELDS) {
      const before = await measure(page, sel);
      await keyboardFocus(page, sel);
      results[sel] = { unfocused: before, focused: await measure(page, sel) };
    }
    await reveal(page);
    if (w <= 900) await page.locator(".message", { hasText: "Ada Okafor" }).click();
    for (const sel of REVIEW_FIELDS) {
      if (w <= 900 && sel.includes("Filter")) continue; // list pane hidden while the mobile detail is open
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      const before = await measure(page, sel);
      await keyboardFocus(page, sel);
      results[sel] = { unfocused: before, focused: await measure(page, sel) };
      if (STAGE && sel === "#draftEditor" && (w === 1440 || w === 390)) {
        await page.screenshot({ path: `${OUT}/screenshots/${STAGE}-draft-editor-focus-${w}.png`, animations: "disabled" });
      }
    }
    record(`fields@${w}`, results);
    if (STAGE === "before") return;
    for (const [sel, v] of Object.entries(results) as [string, { unfocused: { outline: { style: string } }; focused: unknown }][]) {
      expect(v.unfocused.outline.style, `${sel} unfocused`).toBe("none");
      expect(v.focused, sel).toMatchObject({ active: sel.slice(1), outline: { style: "solid", width: "3px", color: FOCUS, offset: "2px" }, clippedByOverflowAncestor: false });
    }
  });
}

test("secondary intents form a named group; checkboxes keep names and states; keyboard toggles; options follow the primary", async ({ page }) => {
  await reveal(page);
  await page.locator(".message", { hasText: "David Chen" }).click();
  const group = page.getByRole("group", { name: "Secondary intents" });
  await expect(group).toHaveCount(1);
  const boxes = group.getByRole("checkbox");
  await expect(boxes).toHaveCount(5);
  for (const name of ["Application status", "Job information", "Documentation / technical", "Withdrawal", "Other / unclear"]) {
    await expect(group.getByRole("checkbox", { name })).toHaveCount(1);
  }
  await expect(group.getByRole("checkbox", { name: "Documentation / technical" })).toBeChecked();
  await expect(group.getByRole("checkbox", { name: "Withdrawal" })).not.toBeChecked();
  await group.getByRole("checkbox", { name: "Withdrawal" }).focus();
  await page.keyboard.press("Space");
  await expect(group.getByRole("checkbox", { name: "Withdrawal" })).toBeChecked();
  await expect(page.locator("#humanReviewStatus")).toHaveText("Pending");
  await page.selectOption("#primaryIntent", "Withdrawal");
  await expect(group.getByRole("checkbox", { name: "Withdrawal" })).toHaveCount(0);
  await expect(group.getByRole("checkbox", { name: "Interview scheduling" })).toBeChecked();
  await expect(boxes).toHaveCount(5);
  record("groupSnapshot", await page.locator(".secondary-options").ariaSnapshot());
});

test("CSV control: keyboard Enter opens the native file chooser and a chosen file is validated", async ({ page }) => {
  await page.goto("/");
  await btn(page, "Load 6-message sample").focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#csvFile")).toBeFocused();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.keyboard.press("Enter")]);
  await chooser.setFiles({ name: "kb.csv", mimeType: "text/csv", buffer: Buffer.from('id,candidate_name,subject,message\r\n"K1","Kay Doe","Hi","Is the role remote?"') });
  await expect(btn(page, "Process 1 valid messages →")).toBeVisible();
  // Exactly one tab stop for the control (no duplicate focusable label).
  await expect(page.locator('label[for="csvFile"]')).not.toHaveAttribute("tabindex");
});
