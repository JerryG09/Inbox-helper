// UI-06C parity classification for EVERY legacy parity case (53 states x 4 widths). The legacy harness
// (parity.spec.ts) is untouched; its helpers, STATES, WIDTHS, EXCEPTIONS and CASES (lines 18-145 at 5a951f5) are copied
// verbatim below. Per case, threshold 0, no masks:
//  control:   app vs approved HTML + the WHOLE override sheet (ui-06a-accessibility.css) injected -> 0 px, or only
//             <= 1/255 anti-aliasing residue inside UI-06C-targeted elements (re-coloured rounded field borders);
//  isolation: app vs approved HTML + only the PRE-UI-06C part of that sheet -> every differing pixel must lie inside
//             the boxes of elements targeted by the UI-06C selectors (so nothing else changed, including geometry);
//  recorded:  app vs the unmodified approved HTML.
// Evidence runs only: UI06C_PARITY=1 appends to docs/evidence/day4-ui06c/parity-classification.jsonl.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const REF = path.resolve("reference/hifi-v1.1");
const CANONICAL = "file://" + path.join(REF, "prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
const OVERRIDE = readFileSync("src/styles/ui-06a-accessibility.css", "utf8");
const MARK = "/* UX-A11Y-05";
const PRE_UI06C = OVERRIDE.slice(0, OVERRIDE.indexOf(MARK));
// Elements whose appearance UI-06C is allowed to change (unfocused states; the checkbox rule is focus-only).
const UI06C_TARGETS = [".grouphead span:nth-child(2)", ".footer", ".work-toolbar-sub", ".readback", ".edit-label", ".preview th",
  ".message:nth-of-type(3n) .avatar", ".eyebrow", ".side-fine", ".btn.danger", ".queue-count",
  '.field input:not([type="checkbox"]):not([type="radio"])', ".field textarea", ".draftarea"];
const EVIDENCE = process.env.UI06C_PARITY === "1";
const OUTFILE = "docs/evidence/day4-ui06c/parity-classification.jsonl";

// ---- copied verbatim from test/visual/parity.spec.ts (5a951f5), lines 18-145 ----
type Step = (page: Page) => Promise<void>;
type Case = { name: string; width: number; height: number; steps: Step; frozen?: string; exception?: { id: string; canonicalSteps: Step; unreachableInUnmodified?: boolean } };

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
// Defined terminal state (no sleeps): every record is Completed or Failed, read from the metric cards in both pages.
const settled: Step = (page) => page.waitForFunction(() => {
  const n = [...document.querySelectorAll("section:not(.hidden) .metric .number")].map((e) => parseInt(e.textContent || "", 10));
  return n.length === 4 && n[1]! + n[3]! === n[0];
}).then(() => undefined);
const retryClick = (text: string): Step => seq(click(text), settled);
const toResults: Step = (page) => page.click("#nav-results");
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
  // UI-05A retry states (prototype retryOne()/retryFailed()), reached by the same clicks in the approved HTML.
  "retry-one-recovered": seq(REVEAL, click("Failed queue (1)"), pick("Fatima Yusuf"), retryClick("Retry this message (simulation) →")),
  "retry-failed-toolbar": seq(REVEAL, retryClick("Retry failed")),
  "retry-after-human-reviews": seq(REVEAL, pick("Ada Okafor"), fill("Hi Ada, edited by a human."), click("Approve draft"), click("Reject draft"), clickIfVisible("← All messages"), retryClick("Retry failed")),
  "retry-recovered-show-all": seq(REVEAL, retryClick("Retry failed"), selectReview("All"), pick("Fatima Yusuf")),
  "inbox-after-failed-import": seq(REVEAL, (page) => page.click("#nav-import"), upload("malformed.csv"), (page) => page.click("#nav-inbox")),
  "results-empty": (page) => page.click("#nav-results"),
  // UI-05B Results states (prototype renderResults()), reached by the same clicks in the approved HTML.
  "results-initial": seq(REVEAL, toResults),
  "results-queued-before-reveal": seq(click("Load 6-message sample"), click("Process 6 valid messages →"), toResults),
  "results-partially-reviewed": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), click("Reject draft"), toResults),
  "results-after-retry": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), clickIfVisible("← All messages"), retryClick("Retry failed"), toResults),
  "results-corrected-drafts": seq(
    REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check"), click("Approve draft"),
    selectReview("All"), pick("David Chen"), async (page) => { await page.selectOption("#primaryIntent", "Documentation / technical"); },
    selectReview("All"), pick("Ada Okafor"), click("Approve draft"), selectReview("All"), pick("Ada Okafor"), fill("Hi Ada, could you share two alternative times?"), toResults,
  ),
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
// Owner-approved exception UX-04-01 (27 Oct 2026, "UI-04 R1", Option 2): when no visible record remains selected,
// the mobile detail closes and the list returns. It only changes behavior at ≤900 px. For these cases the gate compares
// the app with the UNCHANGED approved HTML after applying the same correction to the prototype's own state
// (`state.mobileDetail=false; render()`), and separately records/asserts the difference from the unmodified HTML.
const UX_04_01: Step = async (page) => { await page.evaluate("state.mobileDetail = false; render();"); };
const FINAL_REJECTS = seq(REVEAL, pick("Ada Okafor"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft"), click("Reject draft"));
type Exception = { id: string; canonicalSteps: Step; unreachableInUnmodified?: boolean };
const EXCEPTIONS: Record<string, Exception> = {
  "review-all-reviewed": { id: "UX-04-01", canonicalSteps: seq(FINAL_REJECTS, UX_04_01) },
  // Not reachable at all in the unmodified approved HTML (the dead end hides the filters), so no unmodified capture.
  "review-all-reviewed-show-all": { id: "UX-04-01", canonicalSteps: seq(FINAL_REJECTS, UX_04_01, selectReview("All")), unreachableInUnmodified: true },
};
const CASES: Case[] = Object.entries(STATES).flatMap(([state, steps]) =>
  WIDTHS.map(([width, height]) => ({
    name: `${state}-${width}`, width, height, steps, frozen: FROZEN[`${state}-${width}`],
    exception: width <= 900 ? EXCEPTIONS[state] : undefined,
  })),
);
// ---- end of verbatim copy ----

async function capture(page: Page, url: string, steps: Step, css?: string, rects = false) {
  await page.goto(url);
  if (css) await page.addStyleTag({ content: css });
  await steps(page);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  // No animation wait: identical timing to the legacy harness. (Waiting exposed a 1/255 corner-AA difference on the
  // untouched .draft-badge in results-*-390 — raster noise with identical CSS — so capture timing is kept as the harness.)
  const png = PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" }));
  // Boxes are read AFTER the capture, from the settled layout (reading them first caught a 768 px list mid-layout).
  const boxes = rects ? await page.evaluate((sels) => sels.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s))
    .filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [r.x + scrollX - 1, r.y + scrollY - 1, r.width + 2, r.height + 2]; })), UI06C_TARGETS) : [];
  return { png, boxes };
}
function compare(a: PNG, b: PNG, boxes?: number[][]) {
  if (a.width !== b.width || a.height !== b.height) return { sizeMatch: false, diffPixels: -1, outsideTargets: -1, maxDelta: -1 };
  const m = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, m.data, a.width, a.height, { threshold: 0, diffMask: true });
  let outside = 0, maxDelta = 0;
  if (n) for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const i = (y * a.width + x) * 4;
    if (m.data[i + 3]! === 0) continue;
    for (let k = 0; k < 3; k++) maxDelta = Math.max(maxDelta, Math.abs(a.data[i + k]! - b.data[i + k]!));
    if (boxes && !boxes.some(([bx, by, bw, bh]) => x >= bx! && x < bx! + bw! && y >= by! && y < by! + bh!)) outside++;
  }
  return { sizeMatch: true, diffPixels: n, outsideTargets: boxes ? outside : null, maxDelta };
}

for (const c of CASES) {
  test(`classify ${c.name}`, async ({ page }) => {
    await page.setViewportSize({ width: c.width, height: c.height });
    const canonSteps = c.exception ? c.exception.canonicalSteps : c.steps;
    const app = await capture(page, "/", c.steps, undefined, true);
    const control = compare(app.png, (await capture(page, CANONICAL, canonSteps, OVERRIDE)).png, app.boxes);
    const isolation = compare(app.png, (await capture(page, CANONICAL, canonSteps, PRE_UI06C)).png, app.boxes);
    const unmodified = compare(app.png, (await capture(page, CANONICAL, canonSteps)).png);
    if (EVIDENCE) { mkdirSync(path.dirname(OUTFILE), { recursive: true }); appendFileSync(OUTFILE, JSON.stringify({ case: c.name, exception: c.exception?.id ?? null, control, isolation, unmodified }) + "\n"); }
    // Exact, except anti-aliasing residue of <= 1/255 confined to UI-06C-targeted elements (re-coloured field-border corners).
    expect(control.sizeMatch, "same page size as approved HTML + override").toBe(true);
    expect(control.diffPixels === 0 || (control.maxDelta <= 1 && control.outsideTargets === 0), `control residue ${JSON.stringify(control)}`).toBe(true);
    expect(isolation.sizeMatch, "UI-06C changes no page size").toBe(true);
    expect(isolation.outsideTargets ?? 0, "every UI-06C difference lies inside a targeted element").toBe(0);
  });
}
