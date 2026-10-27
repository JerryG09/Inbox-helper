import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const FIXTURES = path.resolve("test/fixtures/csv");
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
const metric = (page: Page, i: number) => page.locator(".metric .number").nth(i);

test("reveal shows grouped queue with exact counts and no duplicate records", async ({ page }) => {
  await reveal(page);
  await expect(metric(page, 0)).toHaveText("6 in batch");
  await expect(metric(page, 1)).toHaveText("5 processed");
  await expect(metric(page, 2)).toHaveText("5 pending");
  await expect(metric(page, 3)).toHaveText("1 failed");
  await expect(page.locator(".queue-count")).toHaveText("5 / 6");
  await btn(page, "Failed queue (1)").click();
  await page.selectOption("#processFilterSelect", "All");
  const names = await page.locator(".message .name").allTextContents();
  expect(names).toHaveLength(6);
  expect(new Set(names).size).toBe(6);
  await expect(page.locator(".message", { hasText: "David Chen" })).toHaveCount(1);
});

test("mobile: list → detail → back keeps records, selection and counts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reveal(page);
  await expect(page.locator(".rightpane")).toBeHidden();
  await page.locator(".message", { hasText: "Grace Bello" }).click();
  await expect(page.locator(".rightpane")).toBeVisible();
  await expect(page.locator(".leftpane")).toBeHidden();
  await expect(page.locator(".original")).toHaveText("I submitted my application last week. Is there an update?");
  await btn(page, "Jump to reply ↓").click();
  await btn(page, "← All messages").click();
  await expect(page.locator(".leftpane")).toBeVisible();
  await expect(page.locator(".message.active .name")).toHaveText("Grace Bello");
  await page.selectOption("#reviewFilterSelect", "All");
  await page.selectOption("#reviewFilterSelect", "Pending");
  await expect(page.locator(".queue-count")).toHaveText("5 / 6");
});

test("custom message reusing sample ID M001 is not given Ada's canned output", async ({ page }) => {
  await page.goto("/");
  await page.fill("#manual-id", "M001");
  await page.fill("#manual-message", "Please withdraw my application.");
  await btn(page, "Validate manual message").click();
  await btn(page, "Process 1 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
  await expect(page.locator(".grouphead span").first()).toHaveText("Withdrawal");
  await expect(page.locator(".notice.ai-summary")).toContainText("NOT an AI-generated classification");
  await expect(page.locator("#draftEditor")).not.toHaveValue(/Ada/);
});

test("failed import keeps the processed batch; a confirmed new import replaces it", async ({ page }) => {
  await reveal(page);
  await page.click("#nav-import");
  await page.setInputFiles("#csvFile", path.join(FIXTURES, "malformed.csv"));
  await page.click("#nav-inbox");
  await expect(metric(page, 0)).toHaveText("6 in batch");
  await page.click("#nav-import");
  page.once("dialog", (d) => d.dismiss());
  await page.setInputFiles("#csvFile", path.join(FIXTURES, "valid.csv"));
  await page.click("#nav-inbox");
  await expect(metric(page, 0)).toHaveText("6 in batch");
  await page.click("#nav-import");
  page.once("dialog", (d) => d.accept());
  await btn(page, "Load 6-message sample").click();
  await page.click("#nav-inbox");
  await expect(page.getByText("Your inbox is waiting")).toBeVisible();
});

test("blocked draft cannot be approved and nothing is sent", async ({ page }) => {
  await reveal(page);
  await page.locator(".message", { hasText: "Sarah James" }).click();
  await expect(page.locator("#approveDraft")).toBeDisabled();
  await expect(page.getByRole("button", { name: /send/i })).toHaveCount(0);
});
