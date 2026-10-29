// UI-06A R1 diagnostic: localise every pixel that differs between the app and the unchanged approved HTML in focused
// draft-editor states. The permitted region is the focused element's rect expanded by outline-offset + outline-width
// (+1 px antialiasing). Outside pixels are clustered and cropped. Each capture is repeated 3x (determinism), and one
// experiment hides the caret in BOTH pages. The parity harness and its thresholds are untouched.
// Evidence runs only: UI06A_R1=1 writes docs/evidence/day3-ui06a-r1/.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const EVIDENCE = process.env.UI06A_R1 === "1";
const OUT = "docs/evidence/day3-ui06a-r1";
const CANONICAL = "file://" + path.resolve("reference/hifi-v1.1/prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
type Step = (page: Page) => Promise<void>;
const seq = (...s: Step[]): Step => async (page) => { for (const x of s) await x(page); };
const click = (t: string): Step => (page) => page.getByRole("button", { name: t, exact: true }).click();
const pick = (n: string): Step => (page) => page.locator(".message", { hasText: n }).click();
const fill = (t: string): Step => (page) => page.fill("#draftEditor", t);
const clickIfVisible = (t: string): Step => async (page) => { const b = page.getByRole("button", { name: t, exact: true }); if (await b.isVisible()) await b.click(); };
const selectReview = (v: string): Step => async (page) => { await clickIfVisible("← All messages")(page); await page.selectOption("#reviewFilterSelect", v); };
const REVEAL = seq(click("Load 6-message sample"), click("Process 6 valid messages →"), click("Reveal simulated AI results →"));
const SAFE = "Hi Sarah, thanks for your message. We will ask the recruitment team for an update on your application.";
// Steps copied verbatim from test/visual/parity.spec.ts.
const STATES: Record<string, Step> = {
  "review-empty-draft": seq(REVEAL, pick("Ada Okafor"), fill("")),
  "review-approved-filter-then-edit": seq(REVEAL, pick("Ada Okafor"), click("Approve draft"), selectReview("Approved"), pick("Ada Okafor"), fill("Hi Ada, could you share two alternative times?")),
  "review-blocked-edited": seq(REVEAL, pick("Sarah James"), fill(SAFE)),
  "review-blocked-reintroduced": seq(REVEAL, pick("Sarah James"), fill(SAFE), click("Run limited mock check"), fill(SAFE + " You are hired.")),
  "review-primary-swap": seq(REVEAL, pick("David Chen"), async (page) => { await page.selectOption("#primaryIntent", "Documentation / technical"); }),
  "review-primary-correct": seq(REVEAL, pick("Grace Bello"), async (page) => { await page.selectOption("#primaryIntent", "Job information"); }),
};
// All 24 focus-dependent parity cases (6 states x 4 widths).
const WIDTHS: [number, number][] = [[1440, 900], [390, 844], [320, 700], [768, 1024]];

// "reference-plus-ui06a-css": control experiment — the reference HTML with ONLY the UI-06A stylesheet injected. If the app
// then matches at 0 px everywhere, every focused-state difference (ring and any repaint side effect) comes from that CSS.
type Variant = "as-captured" | "caret-hidden-both" | "reference-plus-ui06a-css";
const UI06A_CSS = readFileSync("src/styles/ui-06a-accessibility.css", "utf8");
async function capture(page: Page, url: string, steps: Step, variant: Variant) {
  await page.goto(url);
  if (variant === "caret-hidden-both") await page.addStyleTag({ content: "*{caret-color:transparent!important}" });
  if (variant === "reference-plus-ui06a-css" && url === CANONICAL) await page.addStyleTag({ content: UI06A_CSS });
  await steps(page);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const state = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    const r = a.getBoundingClientRect();
    const s = getComputedStyle(a);
    const bar = document.querySelector(".decisionbar") as HTMLElement | null;
    const bs = bar ? getComputedStyle(bar) : null;
    return {
      active: a.id || a.tagName, focusVisible: a.matches(":focus-visible"), rect: [r.x + scrollX, r.y + scrollY, r.width, r.height],
      outline: { style: s.outlineStyle, width: parseFloat(s.outlineWidth) || 0, offset: parseFloat(s.outlineOffset) || 0, color: s.outlineColor },
      border: s.borderColor, boxShadow: s.boxShadow, scroll: [scrollX, scrollY], doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      decisionBar: bar ? { rect: (() => { const b = bar.getBoundingClientRect(); return [b.x + scrollX, b.y + scrollY, b.width, b.height]; })(), position: bs!.position, boxShadow: bs!.boxShadow, background: bs!.backgroundColor, backdrop: bs!.backdropFilter } : null,
    };
  });
  const png = PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" }));
  return { png, state };
}

function localise(a: PNG, b: PNG, allowed: [number, number, number, number]) {
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  const mask = new PNG({ width: a.width, height: a.height });
  const total = pixelmatch(a.data, b.data, mask.data, a.width, a.height, { threshold: 0, diffMask: true });
  const [ax, ay, aw, ah] = allowed;
  const outside: [number, number][] = [];
  let inside = 0, maxOutsideDelta = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (mask.data[(y * a.width + x) * 4 + 3]! === 0) continue;
    if (x >= ax && x < ax + aw && y >= ay && y < ay + ah) inside++;
    else { outside.push([x, y]); const i = (y * a.width + x) * 4; for (let k = 0; k < 3; k++) maxOutsideDelta = Math.max(maxOutsideDelta, Math.abs(a.data[i + k]! - b.data[i + k]!)); }
  }
  // Cluster outside pixels: grid-bucket union (pixels within 6 px join a cluster).
  const clusters: { bbox: number[]; count: number }[] = [];
  for (const [x, y] of outside) {
    const c = clusters.find((k) => x >= k.bbox[0]! - 6 && x <= k.bbox[2]! + 6 && y >= k.bbox[1]! - 6 && y <= k.bbox[3]! + 6);
    if (c) { c.bbox = [Math.min(c.bbox[0]!, x), Math.min(c.bbox[1]!, y), Math.max(c.bbox[2]!, x), Math.max(c.bbox[3]!, y)]; c.count++; }
    else clusters.push({ bbox: [x, y, x, y], count: 1 });
  }
  return { total, inside, outside: outside.length, maxOutsideDelta, clusters, mask };
}

function crop(src: PNG, [x0, y0, x1, y1]: number[], pad: number, scale: number) {
  const x = Math.max(0, x0! - pad), y = Math.max(0, y0! - pad), w = Math.min(src.width, x1! + pad + 1) - x, h = Math.min(src.height, y1! + pad + 1) - y;
  const out = new PNG({ width: w * scale, height: h * scale });
  for (let j = 0; j < h * scale; j++) for (let i = 0; i < w * scale; i++) {
    const s = ((y + Math.floor(j / scale)) * src.width + (x + Math.floor(i / scale))) * 4, d = (j * w * scale + i) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = src.data[s + k]!;
  }
  return PNG.sync.write(out);
}

for (const [name, steps] of Object.entries(STATES)) for (const [w, h] of WIDTHS) for (const variant of ["as-captured", "caret-hidden-both", "reference-plus-ui06a-css"] as Variant[]) {
  test(`${name}-${w} [${variant}]: localise focused-state differences`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    type Run = { allowedRegion: number[]; total: number; inside: number; outside: number; maxOutsideDelta: number; clusters: { bbox: number[]; count: number }[]; appState: Awaited<ReturnType<typeof capture>>["state"]; canonicalState: Awaited<ReturnType<typeof capture>>["state"] };
    const runs: Run[] = [];
    let regionsOut: number[][] = [];
    for (let i = 0; i < (variant === "as-captured" ? 3 : 1); i++) {
      const app = await capture(page, "/", steps, variant);
      const canon = await capture(page, CANONICAL, steps, variant);
      const o = app.state.outline;
      const pad = (o.style === "none" ? 0 : o.offset + o.width) + 1;
      const [rx, ry, rw, rh] = app.state.rect as number[];
      const allowed: [number, number, number, number] = [Math.floor(rx! - pad), Math.floor(ry! - pad), Math.ceil(rw! + 2 * pad), Math.ceil(rh! + 2 * pad)];
      const loc = localise(app.png, canon.png, allowed);
      runs.push({ allowedRegion: allowed, total: loc.total, inside: loc.inside, outside: loc.outside, maxOutsideDelta: loc.maxOutsideDelta, clusters: loc.clusters, appState: app.state, canonicalState: canon.state });
      if (EVIDENCE && i === 0) {
        mkdirSync(`${OUT}/screenshots`, { recursive: true });
        // Crop regions: clusters merged when within 24 px, so every outside pixel is in exactly one cropped region.
        const regions: number[][] = [];
        for (const c of loc.clusters) {
          const r = regions.find((k) => c.bbox[0]! <= k[2]! + 24 && c.bbox[2]! >= k[0]! - 24 && c.bbox[1]! <= k[3]! + 24 && c.bbox[3]! >= k[1]! - 24);
          if (r) { r[0] = Math.min(r[0]!, c.bbox[0]!); r[1] = Math.min(r[1]!, c.bbox[1]!); r[2] = Math.max(r[2]!, c.bbox[2]!); r[3] = Math.max(r[3]!, c.bbox[3]!); } else regions.push([...c.bbox]);
        }
        regionsOut = regions;
        if (variant === "as-captured") regions.forEach((bbox, n) => {
          const c = { bbox };
          const base = `${OUT}/screenshots/${name}-${w}-${variant}-outside${n + 1}`;
          writeFileSync(`${base}-app.png`, crop(app.png, c.bbox, 12, 3));
          writeFileSync(`${base}-reference.png`, crop(canon.png, c.bbox, 12, 3));
          writeFileSync(`${base}-diffmask.png`, crop(loc.mask, c.bbox, 12, 3));
        });
      }
    }
    const result = { case: `${name}-${w}`, variant, runs: runs.map((r) => ({ total: r.total, inside: r.inside, outside: r.outside, maxOutsideDelta: r.maxOutsideDelta, clusters: r.clusters })), deterministic: runs.every((r) => JSON.stringify([r.total, r.inside, r.outside]) === JSON.stringify([runs[0]!.total, runs[0]!.inside, runs[0]!.outside])), allowedRegion: runs[0]!.allowedRegion, cropRegions: regionsOut, appState: runs[0]!.appState, canonicalState: runs[0]!.canonicalState };
    if (EVIDENCE) { mkdirSync(OUT, { recursive: true }); appendFileSync(`${OUT}/diff-localization.jsonl`, JSON.stringify(result) + "\n"); }
    if (variant === "reference-plus-ui06a-css") expect(runs[0]!.total, "with the UI-06A stylesheet injected into the reference, the app must match exactly").toBe(0);
    console.log(`LOC ${result.case} ${variant} total=${runs[0]!.total} inside=${runs[0]!.inside} outside=${runs[0]!.outside} maxDelta=${runs[0]!.maxOutsideDelta} clusters=${runs[0]!.clusters.length} det=${result.deterministic}`);
  });
}
