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
const REPORT = path.resolve("docs/evidence/ui-04/parity-report.json");
mkdirSync(OUT, { recursive: true });

type Step = (page: Page) => Promise<void>;
type Case = { name: string; width: number; height: number; steps: Step; frozen?: string };

const FIXTURES = path.resolve("test/fixtures/csv");
const click = (text: string): Step => (page) => page.getByRole("button", { name: text, exact: true }).click();
const upload = (file: string): Step => (page) => page.setInputFiles("#csvFile", path.join(FIXTURES, file));
const seq = (...steps: Step[]): Step => async (page) => { for (const s of steps) await s(page); };


const clickIfVisible = (text: string): Step => async (page) => {
  const b = page.getByRole("button", { name: text, exact: true });
  if (await b.isVisible()) await b.click(); // "← All messages" is hidden above 900 px by the approved CSS
};
const SAFE = "Hi Sarah, thanks for your message. We will ask the recruitment team for an update on your application.";
const fill = (text: string): Step => (page) => page.fill("#draftEditor", text);
// On ≤900 px the filters live in the list pane, hidden while a detail is open; return to the list first.
const selectReview = (v: string): Step => async (page) => { await clickIfVisible("← All messages")(page); await page.selectOption("#reviewFilterSelect", v); };
const pick = (name: string): Step => (page) => page.locator(".message", { hasText: name }).click();
const REVEAL: Step = seq(click("Load 6-message sample"), click("Process 6 valid messages →"), click("Reveal simulated AI results →"));

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
  "inbox-queued-before-reveal": seq(click("Load 6-message sample"), click("Process 6 valid messages →"), (page) => page.click("#nav-inbox")),
  "inbox-sample-revealed": REVEAL,
  "inbox-select-multi-intent": seq(REVEAL, pick("David Chen")),
  "inbox-select-blocked": seq(REVEAL, pick("Sarah James")),
  "inbox-review-filter-all": seq(REVEAL, async (page) => { await page.selectOption("#reviewFilterSelect", "All"); }),
  "inbox-failed-queue": seq(REVEAL, click("Failed queue (1)")),
  "inbox-failed-detail": seq(REVEAL, click("Failed queue (1)"), pick("Fatima Yusuf")),
  "inbox-attention-only": seq(REVEAL, (page) => page.check(".checkline input")),
  "inbox-no-match": seq(REVEAL, async (page) => { await page.selectOption("#reviewFilterSelect", "Approved"); }),
  "inbox-next-pending": seq(REVEAL, pick("Ada Okafor"), click("Next pending →")),
  "inbox-mobile-detail-open": seq(REVEAL, pick("Grace Bello")),
  "inbox-detail-ada": seq(REVEAL, pick("Ada Okafor")),
  "inbox-mobile-back-to-list": seq(REVEAL, pick("Grace Bello"), clickIfVisible("← All messages")),
  "inbox-custom-id-collision": seq(
    async (page) => { await page.fill("#manual-id", "M001"); await page.fill("#manual-name", "Ada Okafor"); await page.fill("#manual-subject", "Interview change"); await page.fill("#manual-message", "Please withdraw my application."); },
    click("Validate manual message"), click("Process 1 valid messages →"), click("Reveal simulated AI results →"),
  ),
  "review-approve-first": seq(REVEAL, pick("Ada Okafor"), click("Approve draft")),
  "review-reject-first": seq(REVEAL, pick("Ada Okafor"), click("Reject draft")),
  "review-next-pending-after-approve": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), click("Next pending →")),
  "review-approved-filter-then-edit": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), selectReview("Approved"), pick("Ada Okafor"), fill("Hi Ada, could you share two alternative times?")),
  "review-primary-swap": seq(REVEAL, pick("David Chen"), async (page) => { await page.selectOption("#primaryIntent", "Documentation / technical"); }),
  "review-primary-correct": seq(REVEAL, pick("Grace Bello"), async (page) => { await page.selectOption("#primaryIntent", "Job information"); }),
  "review-secondary-add": seq(REVEAL, pick("Ada Okafor"), async (page) => { await page.check('.secondary-options input[value="Job information"]'); }),
  "review-empty-draft": seq(REVEAL, pick("Ada Okafor"), fill("")),
  "review-blocked-recheck-unchanged": seq(REVEAL, pick("Sarah James"), click("Run limited mock check")),
  "review-blocked-edited": seq(REVEAL, pick("Sarah James"), fill(SAFE)),
  "review-blocked-rechecked": seq(REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check")),
  "review-blocked-approved": seq(REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check"), click("Approve draft"), selectReview("All")),
  "review-blocked-reintroduced": seq(REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check"), fill(SAFE + " You are hired.")),
  "review-all-reviewed": seq(REVEAL, pick("Ada Okafor"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft")),
  "review-all-reviewed-show-all": seq(REVEAL, pick("Ada Okafor"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft"), selectReview("All")),
  "inbox-after-failed-import": seq(REVEAL, (page) => page.click("#nav-import"), upload("malformed.csv"), (page) => page.click("#nav-inbox")),
  "results-empty": (page) => page.click("#nav-results"),
};
const WIDTHS: [number, number][] = [[1440, 900], [390, 844], [320, 700], [768, 1024]];
const FROZEN: Record<string, string> = {
  "import-empty-1440": "screenshots/desktop/01-import-empty-1440.png",
  "import-empty-390": "screenshots/mobile/01-import-empty-390.png",
  "inbox-sample-revealed-1440": "screenshots/desktop/02-inbox-review-1440.png",
  "inbox-sample-revealed-390": "screenshots/mobile/02-inbox-list-390.png",
  "inbox-detail-ada-390": "screenshots/mobile/03-review-detail-390.png",
  "inbox-detail-ada-320": "screenshots/mobile/06-detail-320.png",
  "inbox-detail-ada-768": "screenshots/mobile/07-detail-768.png",
  "inbox-select-blocked-1440": "screenshots/desktop/03-blocked-draft-1440.png",
  "inbox-select-blocked-390": "screenshots/mobile/04-blocked-detail-390.png",
};
// Unreachable below 900 px in the approved design: after the last Pending decision the mobile detail pane shows
// "Select a message" without a way back to the list (reported to the owner as a design/correctness conflict).
const DESKTOP_ONLY = new Set(["review-all-reviewed-show-all"]);
const CASES: Case[] = Object.entries(STATES).flatMap(([state, steps]) =>
  WIDTHS.filter(([w]) => w === 1440 || !DESKTOP_ONLY.has(state)).map(([width, height]) => ({ name: `${state}-${width}`, width, height, steps, frozen: FROZEN[`${state}-${width}`] })),
);

const results: Record<string, unknown> = {};

async function capture(page: Page, url: string, steps: Step) {
  await page.goto(url);
  await steps(page);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  // Normalize scroll: full-page captures include the sticky sidebar at the current scroll offset, and Playwright's
  // click-into-view can leave the two pages 1 px apart (observed on "Next pending"). Content is unaffected.
  await page.evaluate(() => window.scrollTo(0, 0));
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
