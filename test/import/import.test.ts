import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CsvParseError, parseCSV } from "@/lib/import/parse-csv";
import { INVALID_SAMPLE_ROWS, SAMPLE_ROWS } from "@/lib/import/sample";
import { applyImport, applyParseError, beginProcessing, cancelProcessing, initialImportState } from "@/lib/import/state";
import { validate } from "@/lib/import/validate";

const fixture = (name: string) => readFileSync(`test/fixtures/csv/${name}`, "utf8");

describe("parseCSV", () => {
  it("parses a valid CSV with CRLF, quoted commas, escaped quotes and embedded newlines", () => {
    const rows = parseCSV(fixture("valid.csv"));
    expect(rows.map((r) => r.id)).toEqual(["C001", "C002", "C003"]);
    expect(rows[0]!.message).toBe("Can we move my interview, please?");
    expect(rows[1]!.message).toBe('She said "hello" twice');
    expect(rows[2]!.message).toBe("Line one\nline two");
    expect(rows.map((r) => r.sourceRow)).toEqual([2, 3, 4]);
  });
  it.each([
    ["missing-message-column.csv", "Missing required column: message"],
    ["missing-id-column.csv", "Missing required column: id"],
    ["malformed.csv", "CSV has an unclosed quote."],
    ["empty.csv", "CSV is empty."],
    ["blank-lines.csv", "CSV is empty."],
  ])("%s → file-level error", (file, message) => {
    expect(() => parseCSV(fixture(file))).toThrow(new CsvParseError(message));
  });
  it("strips a UTF-8 BOM from the header", () => {
    expect(parseCSV(fixture("mixed.csv"))[0]!.id).toBe("C001");
  });
});

describe("validate", () => {
  it("mixed rows: specific row-level reasons, valid rows kept", () => {
    const { valid, invalid, preview } = validate(parseCSV(fixture("mixed.csv")), "b1");
    expect(valid.map((v) => v.importedId)).toEqual(["C001", "C007"]);
    expect(invalid.map((r) => [r.sourceRow, r.reasons])).toEqual([
      [3, ["Empty message"]],
      [4, ["Duplicate ID"]],
      [5, ["Missing ID"]],
      [6, ["ID must use letters, numbers, _ or - (max 64)"]],
      [7, ["Column count mismatch"]],
    ]);
    expect(preview).toHaveLength(7);
    expect(valid.length + invalid.length).toBe(preview.length);
  });
  it("flags over-length messages and the 50-message cap", () => {
    const rows = Array.from({ length: 52 }, (_, i) => ({ id: `X${i}`, candidate_name: "", subject: "", message: i === 0 ? "a".repeat(2001) : "ok" }));
    const { valid, invalid } = validate(rows, "b1");
    expect(invalid.map((r) => r.reasons)).toEqual([["Message over 2,000 characters"], ["Over 50-message cap"], ["Over 50-message cap"]]);
    expect(valid).toHaveLength(49);
  });
  it("trims values and omits empty optional fields", () => {
    const { valid } = validate([{ id: "  A1 ", candidate_name: " ", subject: "", message: "  hi  " }], "b1");
    expect(valid[0]).toEqual({ key: "b1:r2", importedId: "A1", candidateName: undefined, subject: undefined, message: "hi", sourceRow: 2 });
  });
});

describe("approved sample", () => {
  it("6-message sample is all valid", () => {
    const s = applyImport(initialImportState, SAMPLE_ROWS, "x");
    expect([s.valid.length, s.invalid.length]).toEqual([6, 0]);
  });
  it("invalid sample gives 6 valid / 2 invalid with the expected reasons", () => {
    const s = applyImport(initialImportState, INVALID_SAMPLE_ROWS, "x");
    expect([s.valid.length, s.invalid.length]).toEqual([6, 2]);
    expect(s.invalid.map((r) => r.reasons)).toEqual([["Empty message"], ["Duplicate ID"]]);
  });
});

describe("import state", () => {
  it("manual message: valid and invalid", () => {
    const ok = applyImport(initialImportState, [{ id: "M101", candidate_name: "", subject: "", message: "Hello" }], "Manual entry");
    expect([ok.mode, ok.valid.length, ok.fileName]).toEqual(["preview", 1, "Manual entry"]);
    const bad = applyImport(initialImportState, [{ id: "", candidate_name: "", subject: "", message: "" }], "Manual entry");
    expect(bad.invalid[0]!.reasons).toEqual(["Missing ID", "Empty message"]);
  });
  it("repeated imports of the same IDs never collide on internal keys", () => {
    const a = applyImport(initialImportState, SAMPLE_ROWS, "x");
    const b = applyImport(a, SAMPLE_ROWS, "x");
    const keys = [...a.valid, ...b.valid].map((v) => v.key);
    expect(new Set(keys).size).toBe(12);
    expect(a.valid[0]!.importedId).toBe(b.valid[0]!.importedId);
  });
  it("parse error shows the error without inventing records", () => {
    const s = applyParseError(applyImport(initialImportState, SAMPLE_ROWS, "x"), "CSV is empty.");
    expect([s.mode, s.parseError, s.records.length]).toEqual(["parse-error", "CSV is empty.", 0]);
  });
  it("processing queues only valid records, keyed by internal key; cancel clears them", () => {
    const s = beginProcessing(applyImport(initialImportState, INVALID_SAMPLE_ROWS, "x"));
    expect(s.processing).toBe(true);
    expect(s.records).toHaveLength(6);
    expect(s.records.every((r) => r.processing === "queued" && r.review === undefined)).toBe(true);
    expect(s.records.map((r) => r.key)).toEqual(s.valid.map((v) => v.key));
    expect(cancelProcessing(s)).toMatchObject({ processing: false, records: [], mode: "preview" });
  });
  it("cannot begin processing with no valid rows", () => {
    const s = applyImport(initialImportState, [{ id: "", candidate_name: "", subject: "", message: "" }], "x");
    expect(beginProcessing(s)).toBe(s);
  });
});
