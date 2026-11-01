// UI-06 (Day 4): WCAG 2.2 A/AA-targeted automated checks, simulated mode, Chromium only. Focus is reached with real Tab
// presses across every view/state. Automated checks only — not a screen-reader test and not a conformance claim.
// UI06_STAGE=before|after additionally writes measurements/screenshots to docs/evidence/day4-ui06/ (evidence runs);
// with UI06_STAGE=before the A11Y-04 contrast assertion is skipped so the defect can be recorded rather than fail the run.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";

const STAGE = process.env.UI06_STAGE;
const OUT = "docs/evidence/day4-ui06";
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const record = (file: string, value: unknown) => { if (STAGE) { mkdirSync(OUT, { recursive: true }); appendFileSync(`${OUT}/${file}-${STAGE}.jsonl`, JSON.stringify(value) + "\n"); } };
const shot = async (page: Page, name: string) => { if (STAGE) { mkdirSync(`${OUT}/screenshots`, { recursive: true }); await page.screenshot({ path: `${OUT}/screenshots/${STAGE}-${name}.png` }); } };

// WCAG relative luminance contrast of two "rgb(a)" strings (alpha composited over white).
function rgb(s: string): [number, number, number] {
  const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [255, 255, 255];
  const [r, g, b, a = 1] = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number) as number[];
  return [r!, g!, b!].map((c) => Math.round(c * a! + 255 * (1 - a!))) as [number, number, number];
}
const lum = (c: [number, number, number]) => { const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return Math.round(((x! + 0.05) / (y! + 0.05)) * 100) / 100; };

type States = Record<string, (page: Page) => Promise<void>>;
const reveal = async (page: Page) => {
  await page.goto("/");
  await btn(page, "Load 6-message sample").click();
  await btn(page, "Process 6 valid messages →").click();
  await btn(page, "Reveal simulated AI results →").click();
};
const pick = (page: Page, name: string) => page.locator(".message", { hasText: name }).first().click();
const STATES: States = {
  "import-empty": async (p) => { await p.goto("/"); },
  "import-preview-errors": async (p) => { await p.goto("/"); await btn(p, "Load 6-message sample").click(); },
  "inbox-review": async (p) => { await reveal(p); await pick(p, "Ada Okafor"); },
  "inbox-blocked": async (p) => { await reveal(p); await pick(p, "Sarah James"); },
  "inbox-failed-retry": async (p) => { await reveal(p); await btn(p, "Failed queue (1)").click(); await pick(p, "Fatima Yusuf"); },
  "results": async (p) => { await reveal(p); await pick(p, "Grace Bello"); await btn(p, "Approve draft").click(); await p.locator("#nav-results").click(); },
};

// One keyboard-focus stop: what is focused, how it is indicated, against what, and whether it is visible/unobscured.
const inspect = (page: Page) => page.evaluate(() => {
  const focused = document.activeElement as HTMLElement | null;
  if (!focused || focused === document.body) return null;
  // UX-A11Y-02: the sr-only CSV input is indicated on its visible label, so the label is what is measured.
  const proxy = focused.id === "csvFile" ? document.querySelector<HTMLElement>('label[for="csvFile"]') : null;
  const el = proxy ?? focused;
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  const transparent = (c: string) => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
  let bg = "rgb(255, 255, 255)", bgFrom = "default-white", gradient = false;
  for (let a: Element | null = el.parentElement; a; a = a.parentElement) {
    const as = getComputedStyle(a);
    if (as.backgroundImage !== "none") gradient = true;
    if (!transparent(as.backgroundColor)) { bg = as.backgroundColor; bgFrom = a.className || a.tagName; break; }
  }
  const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
  const hit = document.elementFromPoint(cx, cy);
  const label = (focused.id === "csvFile" ? "csvFile (label)" : el.getAttribute("aria-label") || el.textContent || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
  return {
    tag: focused.tagName.toLowerCase(), id: focused.id, cls: el.className && typeof el.className === "string" ? el.className : "", label,
    focusVisible: focused.matches(":focus-visible"), measuredOn: proxy ? "label[for=csvFile]" : "self", outline: { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset },
    ownBackground: s.backgroundColor, adjacentBackground: bg, adjacentFrom: bgFrom, ancestorGradient: gradient,
    rect: [r.x, r.y, r.width, r.height].map(Math.round), inViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    unobscured: !!hit && (hit === el || el.contains(hit) || hit.contains(el)),
  };
});

async function tabWalk(page: Page, max = 160) {
  await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: NonNullable<Awaited<ReturnType<typeof inspect>>>[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const s = await inspect(page);
    if (!s) continue;
    const key = `${s.tag}#${s.id}|${s.label}|${s.rect.join(",")}`;
    if (seen.has(key)) break; // wrapped around: focus left the page and returned (no trap)
    seen.add(key); stops.push(s);
  }
  return stops;
}

const A11Y04 = /^(button|a|summary)$/;
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  for (const [state, setup] of Object.entries(STATES)) {
    test(`@${w} ${state}: every Tab stop is visibly focused, unobscured, and (A11Y-04) indicators reach 3:1`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await setup(page);
      const stops = await tabWalk(page);
      expect(stops.length).toBeGreaterThan(3);
      const rows = stops.map((s) => ({ ...s, focusContrast: contrast(s.outline.color, s.adjacentBackground) }));
      rows.forEach((row) => record("focus-stops", { viewport: `${w}x${h}`, state, ...row }));
      await shot(page, `${state}-${w}-last-stop`);
      for (const r of rows) {
        expect.soft(r.focusVisible, `${state} ${r.label}: :focus-visible`).toBe(true);
        expect.soft(r.outline.style, `${state} ${r.label}: outline`).not.toBe("none");
        expect.soft(r.inViewport && r.unobscured, `${state} ${r.label}: focus not obscured (2.4.11)`).toBe(true);
        if (STAGE !== "before" && A11Y04.test(r.tag)) expect.soft(r.focusContrast, `${state} ${r.tag} "${r.label}" on ${r.adjacentBackground}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
}

// Focused screenshots of representative A11Y-04 controls (desktop + mobile), for before/after comparison.
const SAMPLES: [string, string, string][] = [
  ["import-empty", "load-sample", 'button:has-text("Load 6-message sample")'],
  ["import-empty", "reset", ".reset-btn"],
  ["import-empty", "nav-inbox", "#nav-inbox"],
  ["inbox-review", "approve", 'button:has-text("Approve draft")'],
  ["inbox-review", "message-row", ".message >> nth=1"],
  ["inbox-review", "summary-original", 'summary:has-text("View preserved original AI output")'],
  ["inbox-blocked", "summary-historical", 'summary:has-text("Historical AI finding")'],
];
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  test(`@${w}: focused A11Y-04 control screenshots and computed styles`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    for (const [state, name, sel] of SAMPLES) {
      await STATES[state]!(page);
      const loc = page.locator(sel).first();
      if (!(await loc.isVisible())) { record("focus-samples", { viewport: `${w}x${h}`, state, name, visible: false }); continue; }
      await loc.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
      const s = await inspect(page);
      record("focus-samples", { viewport: `${w}x${h}`, state, name, ...s, focusContrast: s ? contrast(s.outline.color, s.adjacentBackground) : null });
      if (STAGE) { const box = await loc.boundingBox(); if (box) await page.screenshot({ path: `${OUT}/screenshots/${STAGE}-focus-${name}-${w}.png`, clip: { x: Math.max(box.x - 14, 0), y: Math.max(box.y - 14, 0), width: Math.min(box.width + 28, w), height: box.height + 28 } }); }
    }
  });
}

// 1.4.10 Reflow (320 CSS px) and 720×450 (CSS-px equivalent of 200% zoom on 1440×900 — NOT actual browser zoom).
for (const [w, h] of [[320, 640], [720, 450]] as const) {
  for (const [state, setup] of Object.entries(STATES)) {
    test(`@${w} ${state}: no page-level horizontal scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await setup(page);
      const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      record("reflow", { viewport: `${w}x${h}`, state, ...m });
      await shot(page, `reflow-${state}-${w}`);
      expect.soft(m.scrollWidth, `${state} @${w}`).toBeLessThanOrEqual(m.clientWidth);
    });
  }
}

// 1.4.12 Text Spacing: WCAG's bookmarklet values; report horizontal overflow and text clipped inside overflow:hidden boxes.
test("@1440 and @390: text-spacing override causes no overflow or clipped text", async ({ page }) => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [state, setup] of Object.entries(STATES)) {
      await setup(page);
      await page.addStyleTag({ content: "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}" });
      const m = await page.evaluate(() => {
        const clipped: string[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
          const s = getComputedStyle(el);
          if (!el.offsetParent || !el.textContent?.trim()) continue;
          if (/hidden|clip/.test(s.overflowX + s.overflowY) && s.textOverflow !== "ellipsis" && !el.classList.contains("sr-only") && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) clipped.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80));
        }
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, clipped };
      });
      record("text-spacing", { viewport: `${w}x${h}`, state, ...m });
      expect.soft(m.scrollWidth, `${state} @${w} horizontal overflow`).toBeLessThanOrEqual(m.clientWidth);
      expect.soft(m.clipped, `${state} @${w} clipped text`).toEqual([]);
    }
  }
});

// 2.5.8 Target Size (Minimum): 24×24 CSS px, or the spacing exception (24 px circle around centre clear of other targets).
test("@1440 and @390: interactive targets are at least 24×24 or meet the spacing exception", async ({ page }) => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [state, setup] of Object.entries(STATES)) {
      await setup(page);
      const small = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>("button, a[href], summary, select, input:not(.sr-only), textarea, label[for='csvFile']")).filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden");
        const rects = els.map((e) => e.getBoundingClientRect());
        return els.flatMap((e, i) => {
          const r = rects[i]!;
          if (r.width >= 24 && r.height >= 24) return [];
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const clear = rects.every((o, j) => j === i || Math.hypot(Math.max(o.left - cx, 0, cx - o.right), Math.max(o.top - cy, 0, cy - o.bottom)) >= 12);
          const inline = e.tagName === "INPUT" && (e as HTMLInputElement).type === "checkbox" && !!e.closest("label"); // whole label is the target
          return [{ tag: e.tagName.toLowerCase(), label: (e.textContent || e.id || "").trim().slice(0, 50), size: [Math.round(r.width), Math.round(r.height)], spacingException: clear, labelExtendsTarget: inline }];
        });
      });
      record("target-size", { viewport: `${w}x${h}`, state, undersized: small });
      expect.soft(small.filter((s) => !s.spacingException && !s.labelExtendsTarget), `${state} @${w}`).toEqual([]);
    }
  }
});

// Forced colours (EMULATED via media feature; not Windows High Contrast): focus outlines must survive.
test("forced-colors emulation: keyboard focus remains indicated", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const state of ["import-empty", "inbox-review"]) {
    await STATES[state]!(page);
    const stops = await tabWalk(page, 40);
    stops.forEach((s) => record("forced-colors", { state, tag: s.tag, label: s.label, outline: s.outline }));
    await shot(page, `forced-colors-${state}`);
    for (const s of stops) expect.soft(s.outline.style, `${state} ${s.label}`).not.toBe("none");
  }
});

// 2.1.2 No Keyboard Trap + 2.4.3 order sanity on mobile review: Tab and Shift+Tab both leave the review pane.
test("@390 inbox-review: no keyboard trap in mobile review; reverse order mirrors forward order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await STATES["inbox-review"]!(page);
  const forward = (await tabWalk(page)).map((s) => `${s.tag}|${s.label}`);
  await page.locator("#draftEditor").focus();
  const back: string[] = [];
  for (let i = 0; i < forward.length + 2; i++) { await page.keyboard.press("Shift+Tab"); const s = await inspect(page); if (s) back.push(`${s.tag}|${s.label}`); }
  record("keyboard-order", { forward, backFromDraftEditor: back });
  const idx = forward.findIndex((f) => f.startsWith("textarea"));
  expect(idx).toBeGreaterThan(0);
  expect(back.slice(0, Math.min(idx, 5))).toEqual(forward.slice(Math.max(idx - 5, 0), idx).reverse());
});

// A11Y-05 regression (corrected in UI-06C; was 2.79:1 for "Needs attention only"): every visible checkbox reached by
// keyboard must show an indicator of at least 3:1 against its adjacent background, unclipped.
test("A11Y-05: checkbox keyboard-focus indicators reach 3:1", async ({ page }) => {
  const found: { viewport: string; state: string; label: string; color: string; bg: string; ratio: number; clipped: boolean }[] = [];
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const state of ["inbox-review", "inbox-blocked"]) {
      await STATES[state]!(page);
      const boxes = page.locator('input[type="checkbox"]:visible');
      for (let i = 0; i < (await boxes.count()); i++) {
        const box = boxes.nth(i);
        await box.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
        if (!(await box.evaluate((e) => e === document.activeElement))) continue;
        const s = (await inspect(page))!;
        const clipped = await box.evaluate((el) => {
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el), pad = (parseFloat(cs.outlineWidth) || 0) + (parseFloat(cs.outlineOffset) || 0);
          for (let a = el.parentElement; a; a = a.parentElement) { const as = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(as.overflowX + as.overflowY)) { const b = a.getBoundingClientRect(); if (r.left - pad < b.left || r.right + pad > b.right || r.top - pad < b.top || r.bottom + pad > b.bottom) return true; } }
          return false;
        });
        const label = await box.evaluate((e) => (e.closest("label")?.textContent ?? "").trim());
        found.push({ viewport: `${w}x${h}`, state, label, color: s.outline.color, bg: s.adjacentBackground, ratio: contrast(s.outline.color, s.adjacentBackground), clipped });
        if (STAGE && /Needs attention only/.test(label)) { const b = await box.locator("xpath=..").boundingBox(); if (b) await page.screenshot({ path: `${OUT}/screenshots/${STAGE}-a11y05-${label.replace(/\W+/g, "-").toLowerCase()}-${w}.png`, clip: { x: Math.max(b.x - 10, 0), y: Math.max(b.y - 10, 0), width: Math.min(b.width + 20, w), height: b.height + 20 } }); }
      }
    }
  }
  found.forEach((f) => record("a11y05-checkboxes", f));
  expect(found.some((f) => f.label === "Needs attention only"), "the filter checkbox was reached").toBe(true);
  expect(found.filter((f) => f.ratio < 3 || f.clipped)).toEqual([]);
});

// 1.4.3 Contrast (Minimum) scan: every visible text-bearing element's colour vs its effective solid background.
// Recording only (no assertion): gradients/images under text are flagged as "needs manual check", not passed.
test("1.4.3 text-contrast scan across states (recording)", async ({ page }) => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [state, setup] of Object.entries(STATES)) {
      await setup(page);
      const rows = await page.evaluate(() => {
        const out: { text: string; cls: string; color: string; bg: string; size: number; weight: number; gradient: boolean; opacity: number }[] = [];
        const transparent = (c: string) => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
        for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
          const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(" ");
          if (!own || !el.offsetParent || el.closest(".sr-only,[aria-hidden=true]")) continue;
          const s = getComputedStyle(el);
          // Translucent backgrounds are composited over the ancestors behind them (not over white).
          const layers: number[][] = []; let gradient = false, opacity = 1;
          for (let a: HTMLElement | null = el; a; a = a.parentElement) {
            const as = getComputedStyle(a); opacity *= parseFloat(as.opacity); if (as.backgroundImage !== "none") gradient = true;
            if (transparent(as.backgroundColor)) continue;
            const v = as.backgroundColor.match(/[\d.]+/g)!.map(Number); layers.push([v[0]!, v[1]!, v[2]!, v[3] ?? 1]);
            if ((v[3] ?? 1) >= 1) break;
          }
          let c = [255, 255, 255];
          for (const [r, g, b, al] of layers.reverse()) c = [r! * al! + c[0]! * (1 - al!), g! * al! + c[1]! * (1 - al!), b! * al! + c[2]! * (1 - al!)];
          const bg = `rgb(${c.map(Math.round).join(", ")})`;
          out.push({ text: own.slice(0, 40), cls: (typeof el.className === "string" ? el.className : "") || el.tagName.toLowerCase(), color: s.color, bg, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400, gradient, opacity });
        }
        return out;
      });
      for (const r of rows) {
        const ratio = contrast(r.color, r.bg);
        const large = r.size >= 24 || (r.size >= 18.66 && r.weight >= 700);
        record("text-contrast", { viewport: `${w}x${h}`, state, ...r, ratio, required: large ? 3 : 4.5 });
      }
    }
  }
});

// 2.1.1 end-to-end: Import → Inbox → Review → Approve → Results → CSV using ONLY Tab / Shift+Tab / Enter / Space.
async function tabTo(page: Page, match: RegExp, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const t = await page.evaluate(() => { const a = document.activeElement as HTMLElement; return `${a.tagName}|${a.id}|${(a.textContent ?? "").replace(/\s+/g, " ").trim()}`; });
    if (match.test(t)) return t;
  }
  throw new Error(`keyboard could not reach ${match}`);
}
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  test(`@${w}: complete workflow is operable by keyboard alone, including CSV download`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const steps: string[] = [];
    steps.push(await tabTo(page, /^BUTTON\|.*\|Load 6-message sample$/)); await page.keyboard.press("Enter");
    steps.push(await tabTo(page, /^BUTTON\|.*\|Process 6 valid messages →$/)); await page.keyboard.press("Enter");
    steps.push(await tabTo(page, /^BUTTON\|.*\|Reveal simulated AI results →$/)); await page.keyboard.press("Enter");
    steps.push(await tabTo(page, /^BUTTON\|.*Ada Okafor/)); await page.keyboard.press("Enter");
    steps.push(await tabTo(page, /^TEXTAREA\|draftEditor/)); await page.keyboard.type(" Thanks.");
    steps.push(await tabTo(page, /^BUTTON\|.*\|Approve draft$/)); await page.keyboard.press("Space");
    await expect(page.getByText("Draft approval recorded. No message was sent.")).toBeVisible(); // status announced via the live region
    await page.locator("body").press("Shift+Tab"); // start the next search from wherever focus is
    steps.push(await tabTo(page, /^BUTTON\|nav-results\|/)); await page.keyboard.press("Enter");
    const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { steps.push(await tabTo(page, /^BUTTON\|.*\|Download CSV results$/)); await page.keyboard.press("Enter"); })()]);
    expect(dl.suggestedFilename()).toMatch(/\.csv$/);
    record("keyboard-workflow", { viewport: `${w}x${h}`, steps, download: dl.suggestedFilename() });
  });
}
