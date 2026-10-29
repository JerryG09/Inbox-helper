// AI-02D: PRELIMINARY core-workflow accessibility checks (simulated mode, Chromium). Automated observations only — not
// a screen-reader audit and not evidence of WCAG 2.2 AA conformance; formal qualification is UI-06. Existing keyboard,
// focus and announcement tests in review-, retry-, results- and live-flow specs are reused, not duplicated here.
import { expect, test, type Page } from "@playwright/test";

const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
// Computed focus indication of the focused element and of its <label> (outline, or a box-shadow ring).
const focusStyle = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLElement;
  const ring = (e: Element | null) => { if (!e) return null; const s = getComputedStyle(e); return { outline: `${s.outlineStyle} ${s.outlineWidth}`, shadow: s.boxShadow }; };
  const r = el.getBoundingClientRect();
  return { id: el.id, size: [Math.round(r.width), Math.round(r.height)], self: ring(el), label: ring(el.id ? document.querySelector(`label[for="${el.id}"]`) : null) };
});

test("keyboard only: main navigation and import controls are reachable and operable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main views" }).getByRole("button").first().focus();
  const reached = new Set<string>();
  for (let i = 0; i < 15; i++) {
    reached.add(await page.evaluate(() => { const a = document.activeElement as HTMLElement; return a.id || a.textContent?.trim() || a.tagName; }));
    await page.keyboard.press("Tab");
  }
  for (const name of ["csvFile", "Load 6-message sample", "Test invalid rows", "manual-id", "manual-message"]) expect([...reached]).toContain(name);
  await btn(page, "Load 6-message sample").focus();
  await page.keyboard.press("Enter");
  await expect(btn(page, "Process 6 valid messages →")).toBeVisible();
});

test("draft editor, primary intent and filters expose accessible names", async ({ page }) => {
  await reveal(page);
  await expect(page.getByRole("textbox", { name: "Editable response" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Primary intent" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "AI processing" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Human review" })).toBeVisible();
  // Each secondary-intent checkbox is named by its wrapping label; the "Secondary intents" heading is not a group label.
  const boxes = page.locator(".secondary-options input[type=checkbox]");
  expect(await boxes.count()).toBeGreaterThan(0);
  for (const box of await boxes.all()) expect((await box.evaluate((el) => (el.closest("label")?.textContent ?? "").trim())).length).toBeGreaterThan(0);
  // A11Y-03 (Day 3 AI-02 observation, asserted count 0) — corrected in UI-06A: the checkboxes are a named group.
  await expect(page.getByRole("group", { name: "Secondary intents" })).toHaveCount(1);
});

test("focus visibility observations (recorded, not pass/fail on design)", async ({ page }, info) => {
  await reveal(page);
  const observations: Record<string, unknown> = {};
  await btn(page, "Approve draft").focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
  observations.button = await focusStyle(page);
  await page.locator("#draftEditor").focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
  observations.draftEditor = await focusStyle(page);
  await page.getByRole("navigation", { name: "Main views" }).getByRole("button", { name: /Import/ }).click();
  await btn(page, "Load 6-message sample").focus(); await page.keyboard.press("Shift+Tab");
  observations.csvFile = await focusStyle(page);
  await info.attach("focus-observations.json", { body: JSON.stringify(observations, null, 2), contentType: "application/json" });
  console.log(`A11Y-FOCUS ${JSON.stringify(observations)}`);
  expect((observations.button as { self: { outline: string } }).self.outline).toMatch(/^solid 3px/);
});

test("processing and retry outcomes are announced through the polite global status region", async ({ page }) => {
  await expect(async () => { await page.goto("/"); await expect(page.locator("#globalLive")).toHaveAttribute("aria-live", "polite"); }).toPass();
  await reveal(page);
  await btn(page, "Failed queue (1)").click();
  await btn(page, "Retry failed").click();
  await expect(page.locator("#globalLive")).toContainText("Retry succeeded");
});

// A11Y-02: found in Day 3 AI-02 (pinned with test.fail at 47ca9c7): the sr-only CSV input's focus was invisible and
// its visible label showed no change. Corrected in UI-06A (UX-A11Y-02); now an ordinary regression.
test("A11Y-02: keyboard focus on the CSV file control is visible on its label", async ({ page }) => {
  await page.goto("/");
  await btn(page, "Load 6-message sample").focus();
  await page.keyboard.press("Shift+Tab");
  const s = await focusStyle(page);
  expect(s.id).toBe("csvFile");
  expect(s.label?.outline).toMatch(/^solid/);
});
