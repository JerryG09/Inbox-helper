// UI-06C regressions (A11Y-05 checkbox focus, A11Y-06 text contrast, A11Y-07 field boundaries), simulated mode,
// Chromium. Automated checks only — not a screen-reader test and not a conformance claim.
// UI06C_STAGE=1 additionally writes measurements and before/after crops to docs/evidence/day4-ui06c/. "Before" is the
// approved HTML + the pre-UI-06C override sheet (= the owner-accepted appearance at 5a951f5); "after" is the app.
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const STAGE = process.env.UI06C_STAGE === "1";
const OUT = "docs/evidence/day4-ui06c";
const CANONICAL = "file://" + path.resolve("reference/hifi-v1.1/prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html");
const OVERRIDE = readFileSync("src/styles/ui-06a-accessibility.css", "utf8");
const PRE_UI06C = OVERRIDE.slice(0, OVERRIDE.indexOf("/* UX-A11Y-05"));
const DECORATIVE = /(^|\s)(metric-icon|heading-icon|intro-spark)(\s|$)/; // glyph icons beside text labels (A11Y-08)
const record = (file: string, v: unknown) => { if (STAGE) { mkdirSync(OUT, { recursive: true }); appendFileSync(`${OUT}/${file}.jsonl`, JSON.stringify(v) + "\n"); } };

function rgb(s: string): [number, number, number, number] {
  const v = (s.match(/[\d.]+/g) ?? ["255", "255", "255"]).map(Number);
  return [v[0]!, v[1]!, v[2]!, v[3] ?? 1];
}
const lum = (c: number[]) => { const [r, g, b] = c.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x! + 0.05) / (y! + 0.05)) * 100) / 100; };
const blend = (fg: number[], bg: number[], a: number) => fg.slice(0, 3).map((c, i) => c * a + bg[i]! * (1 - a));

const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
type Step = (page: Page) => Promise<void>;
const REVEAL: Step = async (p) => { await btn(p, "Load 6-message sample").click(); await btn(p, "Process 6 valid messages →").click(); await btn(p, "Reveal simulated AI results →").click(); };
const pick = (name: string): Step => (p) => p.locator(".message", { hasText: name }).first().click();
const STATES: Record<string, Step> = {
  "import-empty": async () => {},
  "import-preview-errors": (p) => btn(p, "Load 6-message sample").click(),
  "inbox-list": REVEAL,
  "inbox-review": async (p) => { await REVEAL(p); await pick("Ada Okafor")(p); },
  "inbox-blocked": async (p) => { await REVEAL(p); await pick("Sarah James")(p); },
  "inbox-blocked-finding-open": async (p) => { await REVEAL(p); await pick("Sarah James")(p); await p.locator("summary", { hasText: "Historical AI finding" }).click(); },
  "inbox-failed-retry": async (p) => { await REVEAL(p); await btn(p, "Failed queue (1)").click(); await pick("Fatima Yusuf")(p); },
  "results": async (p) => { await REVEAL(p); await pick("Grace Bello")(p); await btn(p, "Approve draft").click(); await p.locator("#nav-results").click(); },
};
const VIEWPORTS = [[1440, 900], [390, 844], [320, 700]] as const;

// Composited solid background behind `el` (translucent layers blended over the ancestors actually behind them).
// Call a function source with one element (locator.evaluate treats a string as an expression, not a function).
const call = <T>(loc: import("@playwright/test").Locator, src: string) => loc.evaluate((el, s) => (new Function("return " + s))()(el), src) as Promise<T>;
// Measure at rest: the frozen CSS animates background-color on nav buttons (.14s), which would be caught mid-fade.
const settle = (page: Page) => page.waitForFunction(() => document.getAnimations().length === 0);
const BG_FN = `(el) => { const layers = []; for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor;
  if (/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) continue; const v = c.match(/[\\d.]+/g).map(Number); layers.push([v[0], v[1], v[2], v[3] ?? 1]); if ((v[3] ?? 1) >= 1) break; }
  let c = [255, 255, 255]; for (const [r, g, b, al] of layers.reverse()) c = [r * al + c[0] * (1 - al), g * al + c[1] * (1 - al), b * al + c[2] * (1 - al)]; return c; }`;

for (const [w, h] of VIEWPORTS) {
  // A11Y-06 — 1.4.3: all meaningful text (opacity-aware), plus placeholders. Disabled controls and decorative glyphs exempt.
  test(`@${w} A11Y-06: meaningful text meets 4.5:1 (3:1 large) in every state`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const fails: unknown[] = [];
    for (const [state, setup] of Object.entries(STATES)) {
      await page.goto("/"); await setup(page); await settle(page);
      const rows = await page.evaluate(`(() => { const bgOf = ${BG_FN}; const out = [];
        for (const el of document.querySelectorAll("body *")) {
          const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
          const ph = (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.placeholder && !el.value ? el.placeholder : "";
          if ((!own && !ph) || !el.getClientRects().length || el.closest(".sr-only,[aria-hidden=true]")) continue;
          const s = getComputedStyle(el); if (s.visibility === "hidden") continue;
          let opacity = 1; for (let a = el; a; a = a.parentElement) opacity *= parseFloat(getComputedStyle(a).opacity);
          let gradient = false; for (let a = el; a; a = a.parentElement) { const as = getComputedStyle(a); if (as.backgroundImage !== "none") { gradient = true; break; } if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(as.backgroundColor)) break; }
          const base = { cls: typeof el.className === "string" ? el.className : "", tag: el.tagName.toLowerCase(), disabled: !!el.closest(":disabled"), bg: bgOf(el), opacity, gradient };
          if (own) out.push({ ...base, kind: "text", text: own.slice(0, 40), color: s.color, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400 });
          if (ph) { const p = getComputedStyle(el, "::placeholder"); out.push({ ...base, kind: "placeholder", text: ph.slice(0, 40), color: p.color, size: parseFloat(p.fontSize), weight: Number(p.fontWeight) || 400 }); }
        } return out; })()`) as { cls: string; tag: string; disabled: boolean; bg: number[]; opacity: number; gradient: boolean; kind: string; text: string; color: string; size: number; weight: number }[];
      for (const r of rows) {
        const fg = rgb(r.color);
        const eff = blend(fg, r.bg, fg[3]! * r.opacity);
        const large = r.size >= 24 || (r.size >= 18.66 && r.weight >= 700);
        const value = ratio(eff, r.bg), required = large ? 3 : 4.5;
        const exempt = r.disabled ? "inactive control" : DECORATIVE.test(r.cls) ? "decorative glyph (A11Y-08)" : r.gradient ? "text over gradient: manual check" : null;
        record("text-contrast", { viewport: `${w}x${h}`, state, ...r, effective: eff.map(Math.round), ratio: value, required, exempt });
        if (!exempt && value < required) fails.push({ state, cls: r.cls, kind: r.kind, text: r.text, color: r.color, bg: r.bg.map(Math.round), value });
      }
    }
    expect(fails).toEqual([]);
  });

  // A11Y-07 — 1.4.11: text fields identified only by their border; the frozen focus border and the focus ring are preserved.
  test(`@${w} A11Y-07: essential field boundaries reach 3:1; focus styling preserved; selects recorded`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const problems: string[] = [];
    for (const state of ["import-empty", "inbox-review", "inbox-blocked"]) {
      await page.goto("/"); await STATES[state]!(page); await settle(page);
      const fields = page.locator('.field input:not([type="checkbox"]):not([type="radio"]):visible, .field textarea:visible, .draftarea:visible, select:visible');
      for (let i = 0; i < (await fields.count()); i++) {
        const f = fields.nth(i);
        const m = await call<{ id: string; tag: string; border: string; width: string; radius: string; own: number[]; outside: number[] }>(f, `(el) => { const bgOf = ${BG_FN}; const s = getComputedStyle(el); return { id: el.id, tag: el.tagName.toLowerCase(),
          border: s.borderTopColor, width: s.borderTopWidth, radius: s.borderTopLeftRadius, own: bgOf(el), outside: bgOf(el.parentElement) }; }`);
        const b = rgb(m.border);
        const vsOutside = ratio(b, m.outside), vsInside = ratio(b, m.own);
        await f.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
        const focused = await f.evaluate((el) => { const s = getComputedStyle(el); return { active: document.activeElement === el, border: s.borderTopColor, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, offset: s.outlineOffset }; });
        record("field-boundaries", { viewport: `${w}x${h}`, state, ...m, vsOutside, vsInside, focused });
        if (m.tag !== "select" && (vsOutside < 3 || vsInside < 3)) problems.push(`${state} ${m.id || m.tag}: ${vsOutside}/${vsInside}`);
        if (m.width !== "1px") problems.push(`${state} ${m.id}: border width ${m.width}`);
        if (focused.active && m.tag !== "select" && !focused.outline.startsWith("solid 3px rgb(79, 70, 229)")) problems.push(`${state} ${m.id}: focus ring ${focused.outline}`);
        if (focused.active && /draftEditor|manual-/.test(m.id) && focused.border === m.border) problems.push(`${state} ${m.id}: frozen :focus border no longer applies`);
      }
    }
    expect(problems).toEqual([]);
  });

  // A11Y-05 — mobile/desktop list view: the filter checkbox ring reaches 3:1 and keeps 3px / 3px geometry.
  test(`@${w} A11Y-05: "Needs attention only" focus ring reaches 3:1 with unchanged geometry`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/"); await REVEAL(page);
    const box = page.locator(".checkline input[type=checkbox]");
    await expect(box).toBeVisible();
    const unfocused = await box.evaluate((el) => { const s = getComputedStyle(el); return { outline: s.outlineStyle, accent: s.accentColor, rect: (() => { const r = el.getBoundingClientRect(); return [r.width, r.height]; })() }; });
    await box.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
    await expect(box).toBeFocused();
    const m = await call<{ visible: boolean; color: string; width: string; offset: string; bg: number[] }>(box, `(el) => { const bgOf = ${BG_FN}; const s = getComputedStyle(el); return { visible: el.matches(":focus-visible"), color: s.outlineColor, width: s.outlineWidth, offset: s.outlineOffset, bg: bgOf(el.parentElement) }; }`);
    const value = ratio(rgb(m.color), m.bg);
    record("a11y05", { viewport: `${w}x${h}`, unfocused, focused: m, ratio: value });
    if (STAGE) { mkdirSync(`${OUT}/screenshots`, { recursive: true }); const b = await page.locator(".checkline").boundingBox(); if (b) await page.screenshot({ path: `${OUT}/screenshots/after-a11y05-focus-${w}.png`, clip: { x: Math.max(b.x - 10, 0), y: Math.max(b.y - 10, 0), width: Math.min(b.width + 20, w), height: b.height + 20 } }); }
    expect(m.visible).toBe(true);
    expect([m.width, m.offset]).toEqual(["3px", "3px"]);
    expect(value).toBeGreaterThanOrEqual(3);
    expect(unfocused.outline).toBe("none");
    await box.press("Space"); // checked state still toggles and keeps its ring
    await expect(box).toBeChecked();
  });
}

// Before/after crops of every changed element: before = approved HTML + pre-UI-06C sheet; after = the app.
const CROPS: [string, string, string][] = [
  ["import-empty", ".eyebrow", "eyebrow"], ["import-empty", ".footer", "footer"], ["import-empty", "#manual-id", "field-input"],
  ["import-empty", "#manual-message", "field-textarea"], ["import-preview-errors", ".preview th", "table-header"],
  ["inbox-list", ".grouphead span:nth-child(2)", "group-count"], ["inbox-list", ".work-toolbar-sub", "work-toolbar-sub"],
  ["inbox-list", ".queue-count", "queue-count"], ["inbox-list", ".message:nth-of-type(3n) .avatar", "avatar"],
  ["inbox-review", ".edit-label", "edit-label"], ["inbox-review", ".draftarea", "draft-editor"], ["inbox-review", ".btn.danger", "reject-draft"],
  ["inbox-blocked-finding-open", ".readback", "readback"], ["import-empty", ".side-fine", "side-fine"],
];
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  test(`@${w} before/after crops of every UI-06C target`, async ({ page }) => {
    test.skip(!STAGE, "evidence capture only");
    await page.setViewportSize({ width: w, height: h });
    mkdirSync(`${OUT}/screenshots`, { recursive: true });
    for (const [state, sel, name] of CROPS) {
      for (const [tag, url, css] of [["before", CANONICAL, PRE_UI06C], ["after", "/", ""]] as const) {
        await page.goto(url); if (css) await page.addStyleTag({ content: css });
        await STATES[state]!(page);
        const loc = page.locator(sel).first();
        if (!(await loc.isVisible())) { record("crops", { viewport: w, state, name, tag, visible: false }); continue; }
        await loc.scrollIntoViewIfNeeded();
        const b = (await loc.boundingBox())!;
        await page.screenshot({ path: `${OUT}/screenshots/${tag}-${name}-${w}.png`, clip: { x: Math.max(b.x - 8, 0), y: Math.max(b.y - 8, 0), width: Math.min(b.width + 16, w - Math.max(b.x - 8, 0)), height: b.height + 16 } });
        record("crops", { viewport: w, state, name, tag, visible: true });
      }
    }
  });
}
