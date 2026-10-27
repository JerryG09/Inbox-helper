import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("reference/hifi-v1.1/prototype/MUST-Inbox-Helper-HiFi-V1.1-APPROVED.html", "utf8");
const css = readFileSync("src/styles/hifi-v1.1.css", "utf8");

describe("Hi-fi V1.1 CSS fidelity", () => {
  it("app stylesheet is byte-identical to the approved prototype <style> block", () => {
    const start = html.indexOf("<style>") + "<style>".length;
    const end = html.indexOf("</style>");
    expect(css).toBe(html.slice(start, end));
  });
});
