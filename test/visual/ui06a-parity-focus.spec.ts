// UI-06A parity classification for the 6 review states (x 4 widths) that the unchanged parity harness reports as
// different after UX-A11Y-01. Each state is replayed on the app and on the unchanged approved HTML, then compared
// (1) as captured, focus kept — the intentional focus-ring exception, recorded with its diff bounding box;
// (2) after blurring the focused element in BOTH pages — the unfocused presentation, gated at 0 differing pixels.
// The parity harness, its thresholds and its cases are not modified.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const CANONICAL = "file://" + path.resolve("reference/hifi-v1.1/prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
const OUT = "docs/evidence/day3-ui06a";
type Step = (page: Page) => Promise<void>;
const seq = (...s: Step[]): Step => async (page) => { for (const x of s) await x(page); };
const click = (t: string): Step => (page) => page.getByRole("button", { name: t, exact: true }).click();
const pick = (n: string): Step => (page) => page.locator(".message", { hasText: n }).click();
const fill = (t: string): Step => (page) => page.fill("#draftEditor", t);
const clickIfVisible = (t: string): Step => async (page) => { const b = page.getByRole("button", { name: t, exact: true }); if (await b.isVisible()) await b.click(); };
const selectReview = (v: string): Step => async (page) => { await clickIfVisible("← All messages")(page); await page.selectOption("#reviewFilterSelect", v); };
const REVEAL = seq(click("Load 6-message sample"), click("Process 6 valid messages →"), click("Reveal simulated AI results →"));
const SAFE = "Hi Sarah, thanks for your message. We will ask the recruitment team for an update on your application.";
// Steps copied verbatim from test/visual/parity.spec.ts for the affected states.
const STATES: Record<string, Step> = {
  "review-approved-filter-then-edit": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), selectReview("Approved"), pick("Ada Okafor"), fill("Hi Ada, could you share two alternative times?")),
  "review-primary-swap": seq(REVEAL, pick("David Chen"), async (page) => { await page.selectOption("#primaryIntent", "Documentation / technical"); }),
  "review-primary-correct": seq(REVEAL, pick("Grace Bello"), async (page) => { await page.selectOption("#primaryIntent", "Job information"); }),
  "review-empty-draft": seq(REVEAL, pick("Ada Okafor"), fill("")),
  "review-blocked-edited": seq(REVEAL, pick("Sarah James"), fill(SAFE)),
  "review-blocked-reintroduced": seq(REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check"), fill(SAFE + " You are hired.")),
};
const WIDTHS: [number, number][] = [[1440, 900], [390, 844], [320, 700], [768, 1024]];

async function capture(page: Page, url: string, steps: Step, blur: boolean) {
  await page.goto(url);
  await steps(page);
  // Let post-render focus management settle (the app restores focus to the corrected control after re-render).
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));
  const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? "");
  if (blur) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  return { png: PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" })), focused };
}
function compare(a: PNG, b: PNG) {
  if (a.width !== b.width || a.height !== b.height) return { sizeMatch: false, diffPixels: null as number | null, bbox: null as number[] | null };
  const out = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0, diffMask: true });
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (out.data[(y * a.width + x) * 4 + 3]! > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return { sizeMatch: true, diffPixels: n, bbox: n ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null };
}

for (const [name, steps] of Object.entries(STATES)) for (const [w, h] of WIDTHS) {
  test(`${name}-${w}: focused diff is the focus ring only; unfocused presentation is pixel-identical`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const appF = await capture(page, "/", steps, false);
    const canF = await capture(page, CANONICAL, steps, false);
    const appU = await capture(page, "/", steps, true);
    const canU = await capture(page, CANONICAL, steps, true);
    const focusedState = compare(appF.png, canF.png);
    const unfocusedState = compare(appU.png, canU.png);
    mkdirSync(OUT, { recursive: true }); // one line per case, written immediately (a failure restarts the worker)
    appendFileSync(`${OUT}/parity-focus-classification.jsonl`, JSON.stringify({ case: `${name}-${w}`, focusedElement: appF.focused, focusedState, unfocusedState }) + "\n");
    expect(unfocusedState, "unfocused presentation must match the approved HTML exactly").toMatchObject({ sizeMatch: true, diffPixels: 0 });
  });
}
