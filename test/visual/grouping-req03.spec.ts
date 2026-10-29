// REQ-03B: browser-level qualification of "groups them by what the person wants" (simulated mode, no model).
// Fixture outcomes are the approved V1.1 simulated classifications; the Other / unclear case uses the labelled rule-based
// fallback (NOT AI). These tests prove the grouping and correction workflow, not classification quality.
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const EVIDENCE = "docs/evidence/day3-req03/screenshots";
mkdirSync(EVIDENCE, { recursive: true });
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const pick = (page: Page, name: string) => page.locator(".message", { hasText: name }).click();
async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
async function showAll(page: Page) {
  await page.selectOption("#processFilterSelect", "All");
  await page.selectOption("#reviewFilterSelect", "All");
}
// Queue as rendered: flat siblings grouphead, message, message, grouphead, … → [heading, count, names][].
const groups = (page: Page) => page.locator(".listbody").evaluate((el) => {
  const out: [string, string, string[]][] = [];
  for (const c of Array.from(el.children)) {
    if (c.classList.contains("grouphead")) { const [h, n] = Array.from(c.children).map((s) => s.textContent ?? ""); out.push([h!, n!, []]); }
    else if (c.classList.contains("message")) out[out.length - 1]![2].push(c.querySelector(".name")?.textContent ?? "");
  }
  return out;
});
const resultRow = (page: Page, name: string) => page.locator("#results-view tbody tr", { hasText: name }).locator("td");

test("grouping: same intent together, distinct headings, one group per message, failed kept apart", async ({ page }) => {
  await reveal(page);
  await showAll(page);
  const g = await groups(page);
  expect(g).toEqual([
    ["Interview scheduling", "2", ["Ada Okafor", "David Chen"]],
    ["Application status", "2", ["Sarah James", "Grace Bello"]],
    ["Failed processing", "1", ["Fatima Yusuf"]],
    ["Withdrawal", "1", ["Chidi Okoro"]],
  ]);
  const names = g.flatMap(([, , n]) => n);
  expect(new Set(names).size).toBe(6); // each message exactly once
  expect(new Set(g.map(([h]) => h)).size).toBe(g.length); // distinct headings
  // Multi-intent M002 keeps its secondary without being duplicated into the secondary's group.
  await pick(page, "David Chen");
  await expect(page.locator('.secondary-options input[value="Documentation / technical"]')).toBeChecked();
  expect(g.some(([h]) => h === "Documentation / technical")).toBe(false);
  // Failed is distinguished: no primary intent, no review, Failed in Results.
  await pick(page, "Fatima Yusuf");
  await expect(page.locator("#primaryIntent")).toHaveCount(0);
  await page.screenshot({ path: `${EVIDENCE}/grouping-initial-desktop-1280.png`, fullPage: true, animations: "disabled" });
  await page.click("#nav-results");
  await expect(resultRow(page, "Fatima Yusuf").nth(1)).toHaveText("Failed");
  await expect(resultRow(page, "Fatima Yusuf").nth(2)).toHaveText("—");
});

test("correction: promote secondary and change primary relocate the message, reset review, and reach Results and CSV", async ({ page }) => {
  await reveal(page);
  await showAll(page);
  await pick(page, "David Chen");
  const originalDraft = await page.locator("#draftEditor").inputValue();
  await btn(page, "Approve draft").click();
  await pick(page, "David Chen");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Approved");
  // Promote existing secondary → former primary retained as secondary; review back to Pending.
  await page.selectOption("#primaryIntent", "Documentation / technical");
  await expect(page.locator('.secondary-options input[value="Interview scheduling"]')).toBeChecked();
  await expect(page.locator("#humanReviewStatus")).toHaveText("Pending");
  await expect(page.locator(".original")).toHaveText("My interview link is broken, and I also cannot make tomorrow. Can we move it to Friday?");
  await expect(page.locator("#draftEditor")).toHaveValue(originalDraft);
  // Plain primary change for a single-intent message.
  await pick(page, "Grace Bello");
  await page.selectOption("#primaryIntent", "Job information");
  const g = await groups(page);
  expect(g.find(([h]) => h === "Documentation / technical")?.[2]).toEqual(["David Chen"]);
  expect(g.find(([h]) => h === "Job information")?.[2]).toEqual(["Grace Bello"]);
  expect(g.find(([h]) => h === "Interview scheduling")?.[2]).toEqual(["Ada Okafor"]);
  expect(g.find(([h]) => h === "Application status")?.[2]).toEqual(["Sarah James"]);
  expect(g.flatMap(([, , n]) => n)).toHaveLength(6);

  await page.click("#nav-results");
  await expect(resultRow(page, "David Chen").nth(2)).toHaveText("Documentation / technical");
  await expect(resultRow(page, "David Chen").nth(3)).toHaveText("Pending");
  await expect(resultRow(page, "Grace Bello").nth(2)).toHaveText("Job information");
  const [dl] = await Promise.all([page.waitForEvent("download"), btn(page, "Download CSV results").click()]);
  const csv = readFileSync((await dl.path())!, "utf8");
  expect(csv).toContain('"M002","David Chen","Link problem and schedule","My interview link is broken, and I also cannot make tomorrow. Can we move it to Friday?","Completed","Pending","Documentation / technical","Interview scheduling"');
  expect(csv).toContain('"M004","Grace Bello","Application update","I submitted my application last week. Is there an update?","Completed","Pending","Job information",""');
});

test("out-of-taxonomy message stays in Other / unclear and can be reviewed and approved", async ({ page }) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept());
  const body = 'id,candidate_name,subject,message\r\n"Q901","Tunde Bakare","Quick one","Hey, is the office dog-friendly? Asking for my spaniel lol"';
  await page.setInputFiles("#csvFile", { name: "other.csv", mimeType: "text/csv", buffer: Buffer.from(body) });
  await btn(page, "Process 1 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
  await showAll(page);
  expect(await groups(page)).toEqual([["Other / unclear", "1", ["Tunde Bakare"]]]);
  await pick(page, "Tunde Bakare");
  await expect(page.locator("#primaryIntent")).toHaveValue("Other / unclear");
  await btn(page, "Approve draft").click();
  await page.click("#nav-results");
  await expect(resultRow(page, "Tunde Bakare").nth(2)).toHaveText("Other / unclear");
  await expect(resultRow(page, "Tunde Bakare").nth(3)).toHaveText("Approved");
});

test("mobile 390: groups render and a primary correction relocates the message after returning to the list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reveal(page);
  await showAll(page);
  await pick(page, "Ada Okafor");
  await page.selectOption("#primaryIntent", "Withdrawal");
  await expect(page.locator("#humanReviewStatus")).toHaveText("Pending");
  await btn(page, "← All messages").click();
  await expect(page.locator(".leftpane")).toBeVisible();
  const g = await groups(page);
  expect(g.find(([h]) => h === "Withdrawal")?.[2]).toEqual(["Ada Okafor", "Chidi Okoro"]);
  expect(g.find(([h]) => h === "Interview scheduling")?.[2]).toEqual(["David Chen"]);
  await page.screenshot({ path: `${EVIDENCE}/grouping-after-correction-390.png`, fullPage: true, animations: "disabled" });
});
