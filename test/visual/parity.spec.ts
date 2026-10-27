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
const REPORT = path.resolve("docs/evidence/ui-02/parity-report.json");
mkdirSync(OUT, { recursive: true });

type Step = (page: Page) => Promise<void>;
type Case = { name: string; width: number; height: number; steps: Step; frozen?: string };

const FIXTURES = path.resolve("test/fixtures/csv");
const click = (text: string): Step => (page) => page.getByRole("button", { name: text, exact: true }).click();
const upload = (file: string): Step => (page) => page.setInputFiles("#csvFile", path.join(FIXTURES, file));
const seq = (...steps: Step[]): Step => async (page) => { for (const s of steps) await s(page); };

// Each state is reached by the same user steps in the app and in the approved HTML.
const STATES: Record<string, Step> = {
  "import-empty": async () => {},
  "import-sample-preview": click("Load 6-message sample"),
  "import-invalid-sample-preview": click("Test invalid rows"),
  "import-csv-mixed-preview": upload("mixed.csv"),
  "import-csv-valid-preview": upload("valid.csv"),
  "import-parse-error-malformed": upload("malformed.csv"),
  "import-parse-error-missing-column": upload("missing-message-column.csv"),
  "import-parse-error-empty": upload("empty.csv"),
  "import-manual-valid-preview": async (page) => {
    await page.fill("#manual-id", "M101");
    await page.fill("#manual-name", "Example Person");
    await page.fill("#manual-subject", "Synthetic enquiry");
    await page.fill("#manual-message", "Is the role remote?");
    await click("Validate manual message")(page);
  },
  "import-manual-invalid-preview": click("Validate manual message"),
  "import-processing-queued": seq(click("Load 6-message sample"), click("Process 6 valid messages →")),
  "import-processing-cancelled": seq(click("Load 6-message sample"), click("Process 6 valid messages →"), click("Cancel simulation")),
  "inbox-empty": (page) => page.click("#nav-inbox"),
  "results-empty": (page) => page.click("#nav-results"),
};
const WIDTHS: [number, number][] = [[1440, 900], [390, 844], [320, 700], [768, 1024]];
const FROZEN: Record<string, string> = {
  "import-empty-1440": "screenshots/desktop/01-import-empty-1440.png",
  "import-empty-390": "screenshots/mobile/01-import-empty-390.png",
};
const CASES: Case[] = Object.entries(STATES).flatMap(([state, steps]) =>
  WIDTHS.map(([width, height]) => ({ name: `${state}-${width}`, width, height, steps, frozen: FROZEN[`${state}-${width}`] })),
);

const results: Record<string, unknown> = {};

async function capture(page: Page, url: string, steps: Step) {
  await page.goto(url);
  await steps(page);
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
    const app = await capture(page, "/", c.steps);
    const canon = await capture(page, CANONICAL, c.steps);
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
