// UI-06B (A11Y-04) visual parity: keyboard-focused button/summary states, app vs the unchanged approved HTML.
// Three captures per case: (1) focused, app vs reference — the A11Y-04 difference under review; (2) focused, app vs
// reference + ONLY src/styles/ui-06a-accessibility.css injected — control: must be 0 px if the override explains it all;
// (3) unfocused, app vs reference — ordinary state must be 0 px. threshold 0, no masks; the parity harness is untouched.
// Evidence runs only: A11Y04_PARITY=1 writes docs/evidence/day4-ui06/a11y-04-parity*.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const EVIDENCE = process.env.A11Y04_PARITY === "1";
const OUT = "docs/evidence/day4-ui06";
const CANONICAL = "file://" + path.resolve("reference/hifi-v1.1/prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
const OVERRIDE_CSS = readFileSync("src/styles/ui-06a-accessibility.css", "utf8");
type Step = (page: Page) => Promise<void>;
const seq = (...s: Step[]): Step => async (page) => { for (const x of s) await x(page); };
const click = (t: string): Step => (page) => page.getByRole("button", { name: t, exact: true }).click();
const pick = (n: string): Step => (page) => page.locator(".message", { hasText: n }).click();
const REVEAL = seq(click("Load 6-message sample"), click("Process 6 valid messages →"), click("Reveal simulated AI results →"));
const NONE: Step = async () => {};

// [case, setup, focus target]. Targets cover each affected background (#fff panel, #f5f7fb page) plus the sidebar control.
const CASES: [string, Step, string][] = [
  ["import-load-sample", NONE, 'button:text-is("Load 6-message sample")'],
  ["import-reset", NONE, ".reset-btn"],
  ["sidebar-nav-inbox (unchanged colour)", NONE, "#nav-inbox"],
  ["review-approve", seq(REVEAL, pick("Ada Okafor")), 'button:text-is("Approve draft")'],
  ["review-summary-original", seq(REVEAL, pick("Ada Okafor")), 'summary:has-text("View preserved original AI output")'],
  ["blocked-summary-historical", seq(REVEAL, pick("Sarah James")), 'summary:has-text("Historical AI finding")'],
];
const WIDTHS: [number, number][] = [[1440, 900], [390, 844]];

async function capture(page: Page, url: string, steps: Step, target: string, focus: boolean, injectOverride: boolean) {
  await page.goto(url);
  if (injectOverride) await page.addStyleTag({ content: OVERRIDE_CSS });
  await steps(page);
  const loc = page.locator(target).first();
  const visible = await loc.isVisible();
  if (visible && focus) { await loc.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); }
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0)); // as the parity harness: full page from the top (focus is kept)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));
  const ring = visible ? await page.evaluate(() => {
    const a = document.activeElement as HTMLElement, r = a.getBoundingClientRect(), s = getComputedStyle(a);
    const pad = (parseFloat(s.outlineWidth) || 0) + (parseFloat(s.outlineOffset) || 0) + 1;
    return { active: a.tagName + (a.id ? "#" + a.id : ""), focusVisible: a.matches(":focus-visible"), color: s.outlineColor, rect: [r.x + scrollX - pad, r.y + scrollY - pad, r.width + 2 * pad, r.height + 2 * pad].map(Math.round) };
  }) : null;
  return { visible, ring, png: PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" })) };
}

function diff(a: PNG, b: PNG, allowed?: number[]) {
  if (a.width !== b.width || a.height !== b.height) return { sizeMatch: false, total: -1, outsideRing: -1, bbox: null as number[] | null };
  const mask = new PNG({ width: a.width, height: a.height });
  const total = pixelmatch(a.data, b.data, mask.data, a.width, a.height, { threshold: 0, diffMask: true });
  let outside = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (mask.data[(y * a.width + x) * 4 + 3]! === 0) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    if (allowed && !(x >= allowed[0]! && x < allowed[0]! + allowed[2]! && y >= allowed[1]! && y < allowed[1]! + allowed[3]!)) outside++;
  }
  return { sizeMatch: true, total, outsideRing: outside, bbox: total ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null };
}

for (const [w, h] of WIDTHS) {
  for (const [name, steps, target] of CASES) {
    test(`@${w} ${name}: focused diff localised to the ring; reference + override = 0 px; unfocused = 0 px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      const app = await capture(page, "/", steps, target, true, false);
      test.skip(!app.visible, `${target} not visible at ${w}px in this state`);
      const ref = await capture(page, CANONICAL, steps, target, true, false);
      const refCss = await capture(page, CANONICAL, steps, target, true, true);
      const appU = await capture(page, "/", steps, target, false, false);
      const refU = await capture(page, CANONICAL, steps, target, false, false);
      const focused = diff(app.png, ref.png, app.ring!.rect);
      const control = diff(app.png, refCss.png);
      const unfocused = diff(appU.png, refU.png);
      const row = { case: `${name}-${w}`, appRing: app.ring, refRing: ref.ring, focused, referencePlusOverride: control, unfocused };
      if (EVIDENCE) {
        mkdirSync(`${OUT}/screenshots`, { recursive: true });
        appendFileSync(`${OUT}/a11y-04-parity.jsonl`, JSON.stringify(row) + "\n");
        const r = app.ring!.rect, clip = { x: Math.max(r[0]! - 6, 0), y: Math.max(r[1]! - 6, 0), width: Math.min(r[2]! + 12, w), height: r[3]! + 12 };
        for (const [tag, img] of [["app", app.png], ["reference", ref.png]] as const) {
          const out = new PNG({ width: Math.min(clip.width, img.width - clip.x), height: Math.min(clip.height, img.height - clip.y) });
          PNG.bitblt(img, out, clip.x, clip.y, out.width, out.height, 0, 0);
          writeFileSync(`${OUT}/screenshots/a11y04-parity-${name.split(" ")[0]}-${w}-${tag}.png`, PNG.sync.write(out));
        }
      }
      expect(app.ring!.focusVisible).toBe(true);
      expect(unfocused.total, "ordinary (unfocused) state must be unchanged").toBe(0);
      expect(control.total, "reference + override stylesheet must reproduce the app exactly").toBe(0);
    });
  }
}
