import { expect, test, type Page } from "@playwright/test";

const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const SAFE = "Hi Sarah, thanks for your message. We will ask the recruitment team for an update on your application.";
async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
const pick = (page: Page, name: string) => page.locator(".message", { hasText: name }).click();
const live = (page: Page) => page.locator("#globalLive");

test("typing under the Approved filter keeps editor focus, resets to Pending and updates counts", async ({ page }) => {
  await reveal(page);
  await btn(page, "Approve draft").click();
  await expect(live(page)).toHaveText("Draft approval recorded. No message was sent.");
  await page.selectOption("#reviewFilterSelect", "Approved");
  await pick(page, "Ada Okafor");
  await expect(page.locator(".metric .number").nth(2)).toHaveText("4 pending");
  await page.locator("#draftEditor").click();
  await page.keyboard.type(" Thanks.");
  await expect(page.locator("#draftEditor")).toBeFocused();
  await expect(page.locator("#reviewFilterSelect")).toHaveValue("Pending");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Pending");
  await expect(page.locator(".metric .number").nth(2)).toHaveText("5 pending");
  await expect(page.locator("#draft-change-indicator")).toHaveText("Draft changed. Review pending.");
  await expect(page.locator("#draftEditor")).toHaveValue(/ Thanks\.$/);
});

test("keyboard: primary swap via select keeps focus and both intents", async ({ page }) => {
  await reveal(page);
  await pick(page, "David Chen");
  await page.locator("#primaryIntent").focus();
  await page.selectOption("#primaryIntent", "Documentation / technical");
  await expect(page.locator("#primaryIntent")).toBeFocused();
  await expect(page.locator('.secondary-options input[value="Interview scheduling"]')).toBeChecked();
  await expect(page.locator(".grouphead span").filter({ hasText: "Documentation / technical" })).toHaveCount(1);
  await expect(page.locator(".message", { hasText: "David Chen" })).toHaveCount(1);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(live(page)).toHaveText("Secondary intentions updated. Review pending.");
});

test("blocked M003: edit alone stays blocked; recheck required; approval explicit; reintroduction re-blocks", async ({ page }) => {
  await reveal(page);
  await pick(page, "Sarah James");
  const approve = page.locator("#approveDraft");
  await expect(approve).toBeDisabled();
  page.once("dialog", (d) => { expect(d.message()).toContain("cannot prove a response is safe"); d.dismiss(); });
  await btn(page, "Run limited mock check").click();
  await page.fill("#draftEditor", SAFE);
  await expect(approve).toBeDisabled();
  await expect(page.locator("#attentionPanel")).toContainText("BLOCKED · Original AI claim needs rechecking");
  await btn(page, "Run limited mock check").click();
  await expect(live(page)).toContainText("Limited mock check found no listed phrase");
  await expect(page.locator("#attentionPanel")).toContainText("does not certify this reply as safe");
  await expect(approve).toBeEnabled();
  await expect(page.locator(".message.active .badge.ok")).toHaveText("Initial issue corrected");
  await page.locator("details", { hasText: "Historical AI finding" }).locator("summary").click();
  await expect(page.locator(".readback").first()).toHaveText("Initial AI output asserted unsupported hiring decision");
  await page.fill("#draftEditor", SAFE + " You are hired.");
  await expect(approve).toBeDisabled();
  await page.fill("#draftEditor", SAFE);
  await expect(approve).toBeDisabled(); // still needs a fresh recheck
  await btn(page, "Run limited mock check").click();
  await approve.click();
  await page.selectOption("#reviewFilterSelect", "All");
  await pick(page, "Sarah James");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Approved");
  await page.locator("details", { hasText: "View preserved original AI output" }).locator("summary").click();
  await expect(page.locator(".readback").last()).toHaveText("Congratulations! You have been hired and your offer letter is being prepared.");
});

test("empty draft cannot be approved; reject is a draft decision; no send control anywhere", async ({ page }) => {
  await reveal(page);
  await page.fill("#draftEditor", "   ");
  await expect(page.locator("#approveDraft")).toBeDisabled();
  await expect(page.locator("#decisionHint")).toHaveText("Approval unavailable: blank or blocked draft");
  await btn(page, "Reject draft").click();
  await page.selectOption("#reviewFilterSelect", "Rejected");
  await expect(page.locator(".message .badge").first()).toHaveText("Rejected");
  await expect(page.getByRole("button", { name: /send/i })).toHaveCount(0);
});

test("pending queue completion and Next pending", async ({ page }) => {
  await reveal(page);
  await btn(page, "Next pending →").click();
  await expect(page.locator(".message.active .name")).toHaveText("David Chen");
  for (let i = 0; i < 5; i++) await btn(page, "Reject draft").click();
  await expect(page.getByText("All AI-completed messages reviewed")).toBeVisible();
  await expect(page.getByText("0 approved, 5 rejected. 1 AI failure(s) still require attention.")).toBeVisible();
  await page.selectOption("#reviewFilterSelect", "All");
  await btn(page, "Next pending →").click(); // none pending → Results view (empty until UI-05)
  await expect(page.locator("#pageTitle")).toHaveText("Batch results & export");
});

test("mobile: detail actions are below the draft, Jump to reply, back keeps edits", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reveal(page);
  await pick(page, "Grace Bello");
  const draftBox = await page.locator("#draftEditor").boundingBox();
  const approveBox = await page.locator("#approveDraft").boundingBox();
  expect(approveBox!.y).toBeGreaterThan(draftBox!.y + draftBox!.height);
  await btn(page, "Jump to reply ↓").click();
  await page.fill("#draftEditor", "Hi Grace, we will share an update soon.");
  await btn(page, "← All messages").click();
  await pick(page, "Grace Bello");
  await expect(page.locator("#draftEditor")).toHaveValue("Hi Grace, we will share an update soon.");
});

test("documents approved-design behavior: mobile detail has no way back after the last Pending decision", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reveal(page);
  await pick(page, "Ada Okafor");
  for (let i = 0; i < 5; i++) await btn(page, "Reject draft").click();
  await expect(page.getByText("Select a message")).toBeVisible();
  await expect(btn(page, "← All messages")).toHaveCount(0);
  await expect(page.locator(".leftpane")).toBeHidden();
});
