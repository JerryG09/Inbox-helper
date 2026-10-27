import { expect, test } from "@playwright/test";
import path from "node:path";

const FIXTURES = path.resolve("test/fixtures/csv");

test("mixed CSV shows exact counts and row-level reasons; only valid rows are processable", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#csvFile", path.join(FIXTURES, "mixed.csv"));
  await expect(page.locator(".badge.ok", { hasText: "valid" }).first()).toHaveText("2 valid");
  await expect(page.getByText("5 invalid")).toBeVisible();
  await expect(page.locator("tr.error-row")).toHaveCount(5);
  await expect(page.locator("tr.error-row").nth(1)).toContainText("Duplicate ID");
  await page.getByRole("button", { name: "Process 2 valid messages →" }).click();
  await expect(page.getByText("2 queued; no model calls have been made.", { exact: false })).toBeVisible();
});

test("no valid rows disables processing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Validate manual message" }).click();
  await expect(page.getByRole("button", { name: "Process 0 valid messages →" })).toBeDisabled();
});

test("a parse error after a valid import shows the error and the next import works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load 6-message sample" }).click();
  await page.setInputFiles("#csvFile", path.join(FIXTURES, "malformed.csv"));
  await expect(page.locator(".notice.block")).toHaveText("Import error — CSV has an unclosed quote.. Choose a corrected CSV file.");
  await page.setInputFiles("#csvFile", path.join(FIXTURES, "valid.csv"));
  await expect(page.getByText("3 valid", { exact: true })).toBeVisible();
});

test("manual entry clears the form after validation and repeated imports replace the preview", async ({ page }) => {
  await page.goto("/");
  await page.fill("#manual-id", "M001");
  await page.fill("#manual-message", "Synthetic custom message reusing a sample ID");
  await page.getByRole("button", { name: "Validate manual message" }).click();
  await expect(page.locator("#manual-id")).toHaveValue("");
  await expect(page.getByText("1 valid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load 6-message sample" }).click();
  await expect(page.locator(".preview tbody tr")).toHaveCount(6);
});

test("reset asks for confirmation and returns to the empty state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load 6-message sample" }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "↺ Reset demo" }).click();
  await expect(page.locator(".preview")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "↺ Reset demo" }).click();
  await expect(page.getByText("Empty state: no messages loaded.", { exact: false })).toBeVisible();
});
