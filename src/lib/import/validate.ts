import type { InvalidRow, PreviewRow, RawRow, ValidMessage } from "../domain/types";

export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_FILE_BYTES = 256 * 1024;

// Port of validate() from the approved V1.1 prototype; reason strings are verbatim because the UI shows them.
// `batchId` makes every internal key unique across repeated imports, independent of user-supplied ids.
export function validate(rows: RawRow[], batchId: string) {
  const seen = new Set<string>();
  const valid: ValidMessage[] = [];
  const invalid: InvalidRow[] = [];
  const preview: PreviewRow[] = [];
  rows.forEach((raw, i) => {
    const sourceRow = raw.sourceRow ?? i + 2;
    const id = String(raw.id ?? "").trim();
    const candidateName = String(raw.candidate_name ?? "").trim();
    const subject = String(raw.subject ?? "").trim();
    const message = String(raw.message ?? "").trim();
    const reasons: string[] = [];
    if (!id) reasons.push("Missing ID");
    if (id && !/^[A-Za-z0-9_-]{1,64}$/.test(id)) reasons.push("ID must use letters, numbers, _ or - (max 64)");
    if (!message) reasons.push("Empty message");
    if (message.length > MAX_MESSAGE_CHARS) reasons.push("Message over 2,000 characters");
    if (id && seen.has(id)) reasons.push("Duplicate ID");
    if (raw.columnMismatch) reasons.push("Column count mismatch");
    if (id) seen.add(id);
    if (i >= MAX_MESSAGES) reasons.push("Over 50-message cap");

    preview.push({ sourceRow, id: raw.id, candidateName: raw.candidate_name, subject: raw.subject, reasons: reasons.length ? reasons : null });
    if (reasons.length) invalid.push({ sourceRow, importedId: id, candidateName, subject, message, reasons });
    else valid.push({ key: `${batchId}:r${sourceRow}`, importedId: id, candidateName: candidateName || undefined, subject: subject || undefined, message, sourceRow });
  });
  return { valid, invalid, preview };
}
