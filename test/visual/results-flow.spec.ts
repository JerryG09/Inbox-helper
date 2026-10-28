import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// UI-05B journeys. Every CSV assertion reads the file the browser actually downloaded.
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const pick = (page: Page, name: string) => page.locator(".message", { hasText: name }).click();
const COLUMNS = "id,candidate_name,subject,message,processing_status,review_status,primary_intent,secondary_intents,current_attention_state,current_attention_reasons,historical_ai_findings,original_ai_draft,reviewed_draft,processing_error";
const SAFE = "Hi Sarah, we will ask the recruitment team for an update.";

// Independent RFC 4180 reader for the downloaded bytes.
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows;
}
async function download(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), btn(page, "Download CSV results").click()]);
  expect(dl.suggestedFilename()).toBe("candidate-inbox-demo-results-v1-1.csv");
  const text = readFileSync((await dl.path())!, "utf8");
  const [head, ...rows] = readCsv(text);
  expect(head!.join(",")).toBe(COLUMNS);
  expect(rows.every((r) => r.length === 14)).toBe(true);
  return { text, rows: rows.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i]!]))) };
}
async function reveal(page: Page) {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
}
const results = (page: Page) => page.click("#nav-results");
const tableRows = (page: Page) => page.locator("#results-view tbody tr");
const invariant = (page: Page) => page.locator("#results-view .notice").first();

test("Journey A: initial result — five Completed, one Failed, every record listed in order", async ({ page }) => {
  await reveal(page);
  await btn(page, "View results ↗").click();
  await expect(page.locator("#pageTitle")).toHaveText("Batch results & export");
  await expect(invariant(page)).toHaveText("Invariant: 6 valid = 0 queued + 0 processing + 5 completed + 1 failed. AI completed 5 = 5 pending + 0 approved + 0 rejected.");
  await expect(tableRows(page)).toHaveCount(6);
  await expect(tableRows(page).locator("td:nth-child(1)")).toHaveText(["Ada Okafor", "David Chen", "Sarah James", "Grace Bello", "Fatima Yusuf", "Chidi Okoro"]);
  await expect(tableRows(page).locator("td:nth-child(2)")).toHaveText(["Completed", "Completed", "Completed", "Completed", "Failed", "Completed"]);
  await expect(tableRows(page).nth(4).locator("td")).toHaveText(["Fatima Yusuf", "Failed", "—", "N/A", "N/A", "—"]);
  await expect(tableRows(page).nth(2).locator("td")).toHaveText(["Sarah James", "Completed", "Application status", "Pending", "Blocked", "Original AI claim unresolved"]);
  await expect(page.getByRole("table", { name: "Batch results by message" })).toBeVisible();
  const { rows } = await download(page);
  expect(rows.map((r) => r.processing_status)).toEqual(["Completed", "Completed", "Completed", "Completed", "Failed", "Completed"]);
});

test("Journey B: human decisions — Results and CSV show current state, not the original mock output", async ({ page }) => {
  await reveal(page);
  await pick(page, "Ada Okafor");
  await page.fill("#draftEditor", "Hi Ada, edited by a human.");
  await btn(page, "Approve draft").click(); // → David
  await page.selectOption("#primaryIntent", "Documentation / technical");
  await btn(page, "Reject draft").click(); // David's DRAFT rejected
  await page.selectOption("#reviewFilterSelect", "All");
  await pick(page, "Grace Bello");
  await page.fill("#draftEditor", "Hi Grace, edited and still pending.");
  await results(page);
  await expect(invariant(page)).toHaveText("Invariant: 6 valid = 0 queued + 0 processing + 5 completed + 1 failed. AI completed 5 = 3 pending + 1 approved + 1 rejected.");
  await expect(tableRows(page).nth(1).locator("td")).toHaveText(["David Chen", "Completed", "Documentation / technical", "Rejected", "Needs attention", "—"]);
  const { rows } = await download(page);
  expect(rows[0]).toMatchObject({ review_status: "Approved", reviewed_draft: "Hi Ada, edited by a human." });
  expect(rows[0]!.original_ai_draft).toMatch(/Could you share some alternative times\?/);
  expect(rows[1]).toMatchObject({ review_status: "Rejected", primary_intent: "Documentation / technical", secondary_intents: "Interview scheduling" });
  expect(rows[3]).toMatchObject({ review_status: "Pending", reviewed_draft: "Hi Grace, edited and still pending." });
  // Editing the approved draft afterwards resets it to Pending in Results and export.
  await btn(page, "Back to review").click();
  await expect(page.locator("#pageTitle")).toHaveText("Inbox & human review");
  await pick(page, "Ada Okafor");
  await page.fill("#draftEditor", "Hi Ada, edited again.");
  await results(page);
  await expect(tableRows(page).nth(0).locator("td:nth-child(4)")).toHaveText("Pending");
  expect((await download(page)).rows[0]).toMatchObject({ review_status: "Pending", reviewed_draft: "Hi Ada, edited again." });
});

test("Journey C: M003 blocker — current state changes, the original unsafe finding stays in history and export", async ({ page }) => {
  await reveal(page);
  await pick(page, "Sarah James");
  await page.fill("#draftEditor", SAFE);
  await btn(page, "Run limited mock check").click();
  await results(page);
  await expect(tableRows(page).nth(2).locator("td")).toHaveText(["Sarah James", "Completed", "Application status", "Pending", "Corrected — pending review", "Initial AI claim corrected"]);
  await page.click("#nav-inbox");
  await btn(page, "Approve draft").click();
  await results(page);
  await expect(tableRows(page).nth(2).locator("td:nth-child(5) .badge.ok")).toHaveText("Corrected — approved after review");
  const { rows } = await download(page);
  expect(rows[2]).toMatchObject({
    review_status: "Approved", current_attention_state: "Corrected — approved after review", current_attention_reasons: "",
    historical_ai_findings: "Initial AI output asserted unsupported hiring decision",
    original_ai_draft: "Congratulations! You have been hired and your offer letter is being prepared.", reviewed_draft: SAFE,
  });
});

test("Journey D: failure recovery — counts, status and export update without reprocessing completed records", async ({ page }) => {
  await reveal(page);
  await btn(page, "Approve draft").click(); // Ada approved before the retry
  await results(page);
  const before = (await download(page)).rows;
  await btn(page, "Back to review").click();
  await btn(page, "Retry failed").click();
  await results(page);
  await expect(invariant(page)).toHaveText("Invariant: 6 valid = 0 queued + 0 processing + 6 completed + 0 failed. AI completed 6 = 5 pending + 1 approved + 0 rejected.");
  const after = (await download(page)).rows;
  expect(after[4]).toMatchObject({ id: "M005", processing_status: "Completed", review_status: "Pending", primary_intent: "Documentation / technical", processing_error: "" });
  expect(before[4]).toMatchObject({ processing_status: "Failed", processing_error: "Simulated AI provider timeout" });
  for (const i of [0, 1, 2, 3, 5]) expect(after[i]).toEqual(before[i]); // completed records unchanged
});

test("Journey E: partial results — failures and pending reviews are exported; no validated record omitted", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __MUST_SIM_PLAN__: unknown }).__MUST_SIM_PLAN__ = { "b1:r2": ["fail"], "b1:r3": ["missing"] }; });
  await reveal(page);
  await pick(page, "Sarah James");
  await btn(page, "Reject draft").click();
  await results(page);
  await expect(invariant(page)).toHaveText("Invariant: 6 valid = 0 queued + 0 processing + 3 completed + 3 failed. AI completed 3 = 2 pending + 0 approved + 1 rejected.");
  const { rows } = await download(page);
  expect(rows.map((r) => r.id)).toEqual(["M001", "M002", "M003", "M004", "M005", "M006"]);
  expect(rows.map((r) => [r.processing_status, r.review_status])).toEqual([["Failed", ""], ["Failed", ""], ["Completed", "Rejected"], ["Completed", "Pending"], ["Failed", ""], ["Completed", "Pending"]]);
  expect(rows[1]!.processing_error).toBe("Simulated processing returned no result for this message");
  await expect(page.getByText("All AI-completed messages reviewed")).toHaveCount(0);
});

test("Journey F: security — formula-like text, quotes, delimiters and newlines in the downloaded file", async ({ page }) => {
  const csv = [
    "id,candidate_name,subject,message",
    `F1,"=HYPERLINK(""https://example.test"",""Click"")","+SUM(1,2)","-1+2"`,
    `-2,"@SUM(A1:A2)","Quote ""inside"", comma","Line one, ""quoted""\nLine two\n=1+1"`,
    `F3,Plain Person,Normal subject,"Hello, team"`,
  ].join("\r\n");
  await page.goto("/");
  await page.setInputFiles("#csvFile", { name: "attack.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
  await btn(page, "Process 3 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
  await pick(page, "Plain Person");
  await page.fill("#draftEditor", "\t =HYPERLINK(\"https://example.test\",\"draft\")");
  await results(page);
  const { text, rows } = await download(page);
  expect(text.split("\r\n")[0]).toBe(COLUMNS);
  expect(readCsv(text)).toHaveLength(4); // header + 3 records; embedded newlines stay inside quoted cells
  const executable = (cell: string) => /^[\u0000- ﻿]*[=+\-@]/.test(cell);
  for (const r of rows) for (const cell of Object.values(r)) expect(executable(cell), JSON.stringify(cell)).toBe(false);
  expect(rows[0]).toMatchObject({ id: "F1", candidate_name: `'=HYPERLINK("https://example.test","Click")`, subject: "'+SUM(1,2)", message: "'-1+2" });
  expect(rows[1]).toMatchObject({ id: "'-2", candidate_name: "'@SUM(A1:A2)", subject: 'Quote "inside", comma', message: 'Line one, "quoted"\nLine two\n=1+1' });
  expect(rows[2]).toMatchObject({ message: "Hello, team", reviewed_draft: `'\t =HYPERLINK("https://example.test","draft")` });
  // The application still shows the raw value; only the CSV cell is prefixed.
  await btn(page, "Back to review").click();
  await expect(page.locator("#draftEditor")).toHaveValue("\t =HYPERLINK(\"https://example.test\",\"draft\")");
});

test("Results empty state, keyboard download and navigation", async ({ page }) => {
  await page.goto("/");
  await results(page);
  await expect(page.getByText("No batch results yet")).toBeVisible();
  await reveal(page);
  await results(page);
  await btn(page, "Back to review").focus();
  await page.keyboard.press("Tab");
  await expect(btn(page, "Download CSV results")).toBeFocused();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(dl.suggestedFilename()).toBe("candidate-inbox-demo-results-v1-1.csv");
  await expect(page.locator("#globalLive")).toHaveText("CSV download started. No draft was approved, rejected or sent.");
  await expect(invariant(page)).toContainText("5 pending + 0 approved + 0 rejected"); // export changed nothing
  await btn(page, "Back to review").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pageTitle")).toHaveText("Inbox & human review");
});

for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [1440, 900]] as const) {
  test(`Results @${width}: visible controls, no page overflow, no send or hiring actions`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await reveal(page);
    await results(page);
    await expect(btn(page, "Download CSV results")).toBeVisible();
    await expect(btn(page, "Back to review")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole("button", { name: /send|email|hire|offer|reject candidate|approve all/i })).toHaveCount(0);
  });
}

// Evidence only: injected multi-failure Results has no approved-HTML equivalent (the prototype cannot fail M001/M002),
// so it is captured, not pixel-compared.
for (const [width, height] of [[1440, 900], [390, 844]] as const) {
  test(`evidence @${width}: Results with injected partial processing failures`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { (window as unknown as { __MUST_SIM_PLAN__: unknown }).__MUST_SIM_PLAN__ = { "b1:r2": ["fail"], "b1:r3": ["missing"] }; });
    await reveal(page);
    await results(page);
    await expect(invariant(page)).toContainText("3 completed + 3 failed"); // defined terminal state
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test/visual/artifacts/results-injected-partial-failures-${width}.app.png`, fullPage: true, animations: "disabled" });
  });
}
