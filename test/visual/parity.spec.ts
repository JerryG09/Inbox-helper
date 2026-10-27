import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// Parity harness (contract §1, §2, §10.3). Two comparisons per state:
//  1. GATE: app vs the unchanged approved HTML rendered in this same Chromium/OS/fonts — must be 0 differing pixels.
//  2. REPORT: app vs the frozen PNG captured on the reference machine — recorded with pixel counts, not gated,
//     because cross-machine font rasterization cannot be identical (contract §1).
const REF = path.resolve("reference/hifi-v1.1");
const CANONICAL = "file://" + path.join(REF, "prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
const OUT = path.resolve("test/visual/artifacts");
const REPORT = path.resolve("docs/evidence/day1-01/parity-report.json");
mkdirSync(OUT, { recursive: true });

type Case = { name: string; width: number; height: number; view: "import" | "inbox" | "results"; frozen?: string };
const CASES: Case[] = [
  { name: "import-empty-1440", width: 1440, height: 900, view: "import", frozen: "screenshots/desktop/01-import-empty-1440.png" },
  { name: "import-empty-390", width: 390, height: 844, view: "import", frozen: "screenshots/mobile/01-import-empty-390.png" },
  { name: "import-empty-320", width: 320, height: 700, view: "import" },
  { name: "import-empty-768", width: 768, height: 1024, view: "import" },
  { name: "inbox-empty-1440", width: 1440, height: 900, view: "inbox" },
  { name: "inbox-empty-390", width: 390, height: 844, view: "inbox" },
  { name: "results-empty-1440", width: 1440, height: 900, view: "results" },
  { name: "results-empty-390", width: 390, height: 844, view: "results" },
];

const results: Record<string, unknown> = {};

async function capture(page: Page, url: string, view: Case["view"]) {
  await page.goto(url);
  if (view !== "import") await page.click(`#nav-${view}`);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return { png: PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" })), overflow };
}

function diff(a: PNG, b: PNG, file: string) {
  if (a.width !== b.width || a.height !== b.height) {
    return { sizeMatch: false, a: [a.width, a.height], b: [b.width, b.height], diffPixels: null as number | null, percent: null as number | null };
  }
  const out = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0 });
  writeFileSync(file, PNG.sync.write(out));
  return { sizeMatch: true, a: [a.width, a.height], b: [b.width, b.height], diffPixels: n, percent: +((100 * n) / (a.width * a.height)).toFixed(4) };
}

for (const c of CASES) {
  test(c.name, async ({ page }) => {
    await page.setViewportSize({ width: c.width, height: c.height });
    const app = await capture(page, "/", c.view);
    const canon = await capture(page, CANONICAL, c.view);
    writeFileSync(path.join(OUT, `${c.name}.app.png`), PNG.sync.write(app.png));
    writeFileSync(path.join(OUT, `${c.name}.canonical-live.png`), PNG.sync.write(canon.png));

    const gate = diff(app.png, canon.png, path.join(OUT, `${c.name}.diff-vs-canonical-live.png`));
    const entry: Record<string, unknown> = { viewport: [c.width, c.height], horizontalOverflowPx: app.overflow, vsCanonicalLive: gate };
    if (c.frozen) {
      const frozen = PNG.sync.read(readFileSync(path.join(REF, c.frozen)));
      entry.vsFrozenPng = { file: c.frozen, ...diff(app.png, frozen, path.join(OUT, `${c.name}.diff-vs-frozen.png`)) };
    }
    results[c.name] = entry;

    expect(app.overflow, "no horizontal page overflow").toBeLessThanOrEqual(0);
    expect(gate.sizeMatch, "same full-page size as approved HTML").toBe(true);
    expect(gate.diffPixels, "zero pixel difference vs approved HTML").toBe(0);
  });
}

test.afterAll(() => {
  mkdirSync(path.dirname(REPORT), { recursive: true });
  const prior = (() => { try { return JSON.parse(readFileSync(REPORT, "utf8")); } catch { return {}; } })();
  writeFileSync(REPORT, JSON.stringify({ ...prior, ...results }, null, 2) + "\n");
});
