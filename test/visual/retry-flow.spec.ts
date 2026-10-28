import { expect, test, type Page } from "@playwright/test";

// UI-05A browser workflows. Fault injection uses the simulation-only window plan (see simulationAdapters()); keys are
// INTERNAL record keys (batch b1, CSV row r2…r7 = M001…M006). Nothing here exercises a real provider.
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const pick = (page: Page, name: string) => page.locator(".message", { hasText: name }).click();
const live = (page: Page) => page.locator("#globalLive");
const metric = (page: Page, i: number) => page.locator(".metric .number").nth(i);
const RETRY_ONE = "Retry this message (simulation) →";

async function reveal(page: Page, plan?: Record<string, string[]>) {
  if (plan) await page.addInitScript((p) => { (window as unknown as { __MUST_SIM_PLAN__: unknown }).__MUST_SIM_PLAN__ = p; }, plan);
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
async function expectCounts(page: Page, processed: number, pending: number, failed: number) {
  await expect(metric(page, 0)).toHaveText("6 in batch");
  await expect(metric(page, 1)).toHaveText(`${processed} processed`);
  await expect(metric(page, 2)).toHaveText(`${pending} pending`);
  await expect(metric(page, 3)).toHaveText(`${failed} failed`);
  await expect(page.locator(".work-toolbar button", { hasText: `Failed queue (${failed})` })).toHaveCount(1); // may be hidden behind a mobile detail
}
const noSendOrHiringControls = async (page: Page) =>
  expect(page.getByRole("button", { name: /send|email|hire|offer|reject candidate|approve all/i })).toHaveCount(0);

test("six-message sample: M005 fails first, single retry recovers it without restarting the batch", async ({ page }) => {
  await reveal(page);
  await expectCounts(page, 5, 5, 1);
  await btn(page, "Failed queue (1)").click();
  await expect(page.locator(".message")).toHaveCount(1);
  await pick(page, "Fatima Yusuf");
  await expect(page.locator(".notice.block")).toContainText("Simulated AI provider timeout. No classification or draft was produced.");
  const before = await page.locator(".message").count();
  await btn(page, RETRY_ONE).click();
  await expectCounts(page, 6, 6, 0);
  await expect(page.locator("#processFilterSelect")).toHaveValue("All");
  await expect(page.locator("#reviewFilterSelect")).toHaveValue("Pending");
  await expect(page.locator(".message.active .name")).toHaveText("Fatima Yusuf");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Pending");
  await expect(page.locator("#primaryIntent")).toHaveValue("Documentation / technical");
  await expect(page.locator(".ai-summary")).toContainText("Mock retry succeeded.");
  const group = page.locator(".grouphead", { hasText: "Documentation / technical" });
  await expect(group).toHaveCount(1);
  await expect(page.locator(".grouphead", { hasText: "Failed processing" })).toHaveCount(0);
  await expect(live(page)).toHaveText("Retry succeeded. Message classified as Documentation / technical; review pending. Other messages unchanged.");
  await expect(page.locator(".message.active")).toBeFocused();
  await expect(btn(page, "Retry failed")).toBeDisabled();
  expect(before).toBe(1);
  await expect(page.locator(".message")).toHaveCount(6); // no record created, none lost
  await noSendOrHiringControls(page);
});

test("existing human reviews persist across Retry failed", async ({ page }) => {
  const SAFE = "Hi Sarah, we will ask the recruitment team for an update.";
  await reveal(page);
  await pick(page, "Ada Okafor");
  await page.fill("#draftEditor", "Hi Ada, edited by a human.");
  await btn(page, "Approve draft").click(); // → David
  await page.selectOption("#primaryIntent", "Documentation / technical");
  await page.check('.secondary-options input[value="Job information"]');
  await btn(page, "Reject draft").click(); // David's DRAFT rejected → Sarah
  await page.fill("#draftEditor", SAFE);
  await btn(page, "Run limited mock check").click();
  await btn(page, "Approve draft").click();
  await expectCounts(page, 5, 2, 1);
  await btn(page, "Retry failed").click();
  await expectCounts(page, 6, 3, 0);
  await expect(page.locator(".work-toolbar-sub")).toHaveText("2 approved · 1 rejected drafts · 2 flagged");
  await page.selectOption("#reviewFilterSelect", "All");
  await pick(page, "Ada Okafor");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Approved");
  await expect(page.locator("#draftEditor")).toHaveValue("Hi Ada, edited by a human.");
  await pick(page, "David Chen");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Rejected");
  await expect(page.locator("#primaryIntent")).toHaveValue("Documentation / technical");
  await expect(page.locator('.secondary-options input[value="Interview scheduling"]')).toBeChecked();
  await expect(page.locator('.secondary-options input[value="Job information"]')).toBeChecked();
  await pick(page, "Sarah James");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Approved");
  await expect(page.locator("#draftEditor")).toHaveValue(SAFE);
  await expect(page.locator(".message.active .tags .badge.ok")).toHaveText("Initial issue corrected");
  await page.locator("details", { hasText: "Historical AI finding" }).locator("summary").click();
  await expect(page.locator(".readback").first()).toHaveText("Initial AI output asserted unsupported hiring decision");
});

test("Retry failed with multiple failures: partial success, remaining failure stays recoverable", async ({ page }) => {
  // M001: fails, then recovers. M002: fails twice, then recovers. M005: natural fixture failure, then V1.1 recovery.
  await reveal(page, { "b1:r2": ["fail"], "b1:r3": ["fail", "fail"] });
  await expectCounts(page, 3, 3, 3);
  await btn(page, "Retry failed").click();
  await expectCounts(page, 5, 5, 1);
  await expect(live(page)).toHaveText("Retried 3 failed messages: 2 recovered, 1 still failed. Other messages unchanged.");
  await expect(page.locator(".message.active .name")).toHaveText("Ada Okafor"); // first recovered target
  await btn(page, "Failed queue (1)").click();
  await expect(page.locator(".message .name")).toHaveText(["David Chen"]);
  await pick(page, "David Chen");
  await expect(page.locator(".notice.block")).toContainText("Simulated AI provider timeout");
  await btn(page, RETRY_ONE).click();
  await expectCounts(page, 6, 6, 0);
  await expect(page.locator(".message.active .name")).toHaveText("David Chen");
  await expect(page.locator(".message")).toHaveCount(6);
});

test("a failed single retry keeps the record Failed and focus on its retry control; an adapter exception is explicit", async ({ page }) => {
  await reveal(page, { "b1:r6": ["ok", "fail", "throw"] }); // "ok" = default simulation, where M005 fails
  await btn(page, "Failed queue (1)").click();
  await pick(page, "Fatima Yusuf");
  await btn(page, RETRY_ONE).click();
  await expect(live(page)).toHaveText("Retry failed. The message remains in the Failed queue; other messages unchanged.");
  await expectCounts(page, 5, 5, 1);
  await expect(page.locator("#processFilterSelect")).toHaveValue("Failed");
  await expect(page.locator("#retryOne")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".notice.block")).toContainText("Simulated processing failed unexpectedly. No classification or draft was produced.");
  await expect(page.locator("#retryOne")).toBeFocused();
  await page.keyboard.press("Enter");
  await expectCounts(page, 6, 6, 0);
});

test("keyboard: Retry failed is operable from the keyboard and announces the outcome", async ({ page }) => {
  await reveal(page);
  await btn(page, "Failed queue (1)").focus();
  await page.keyboard.press("Tab");
  await expect(btn(page, "Retry failed")).toBeFocused();
  await page.keyboard.press("Enter");
  // One target → the single-message wording.
  await expect(live(page)).toHaveText("Retry succeeded. Message classified as Documentation / technical; review pending. Other messages unchanged.");
  await expect(page.locator(".message.active")).toBeFocused();
  await expect(page.locator(".message.active .name")).toHaveText("Fatima Yusuf");
});

test("delayed retry: control is not re-entrant and counts reconcile while in flight", async ({ page }) => {
  await reveal(page, { "b1:r6": ["ok", "delay:400"] });
  await btn(page, "Failed queue (1)").click();
  await pick(page, "Fatima Yusuf");
  await btn(page, RETRY_ONE).click();
  // In flight: the record is Processing, so it can be neither retried again nor counted twice.
  await expect(metric(page, 3)).toHaveText("0 failed");
  await expect(metric(page, 1)).toHaveText("5 processed");
  await expect(btn(page, "Retry failed")).toBeDisabled();
  await expect(page.locator("#retryOne")).toHaveCount(0);
  await expectCounts(page, 6, 6, 0); // terminal state
});

test("stale retry result after Reset and a new import does not mutate the new batch", async ({ page }) => {
  await reveal(page, { "b1:r6": ["ok", "delay:500"] });
  await btn(page, "Failed queue (1)").click();
  await pick(page, "Fatima Yusuf");
  await btn(page, RETRY_ONE).click();
  page.on("dialog", (d) => d.accept());
  await btn(page, "↺ Reset demo").click();
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
  await expectCounts(page, 5, 5, 1);
  // Negative check: wait past the injected delay (the only non-terminal wait here), then the new batch is unchanged.
  await page.waitForTimeout(800);
  await expectCounts(page, 5, 5, 1);
  await expect(page.locator(".message")).toHaveCount(5);
});

for (const [width, height] of [[320, 700], [390, 844], [768, 1024]] as const) {
  test(`mobile @${width}: retry from the Failed detail keeps the user oriented and never trapped`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await reveal(page, { "b1:r6": ["ok", "fail"] });
    await btn(page, "Failed queue (1)").click();
    await pick(page, "Fatima Yusuf");
    await expect(page.locator(".rightpane")).toBeVisible();
    await btn(page, RETRY_ONE).click(); // fails again: detail stays, focus returns to the control
    await expect(page.locator("#retryOne")).toBeFocused();
    await expect(page.locator(".workgrid")).toHaveClass(/mobile-detail-open/);
    await btn(page, RETRY_ONE).click(); // recovers: shown under Pending, as in V1.1
    await expectCounts(page, 6, 6, 0);
    await expect(page.locator(".rightpane")).toBeVisible();
    await expect(page.locator("#primaryIntent")).toHaveValue("Documentation / technical");
    await expect(page.locator(".rightpane .mobile-return button").first()).toBeFocused();
    await btn(page, "← All messages").click();
    await expect(page.locator(".leftpane")).toBeVisible();
    await expect(page.locator(".rightpane")).toBeHidden();
    await expect(page.locator("#reviewFilterSelect")).toHaveValue("Pending");
    await expect(page.locator(".message", { hasText: "Fatima Yusuf" })).toBeVisible();
    await page.selectOption("#processFilterSelect", "Failed");
    await expect(page.getByText("No messages match these filters")).toBeVisible();
    await expect(btn(page, "Clear filters")).toBeVisible(); // not trapped
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await noSendOrHiringControls(page);
  });
}
