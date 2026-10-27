import type { RawRow } from "../domain/types";

// The approved six-message synthetic sample (demoRows in the V1.1 prototype), verbatim. All people are fictional.
export const SAMPLE_ROWS: readonly RawRow[] = [
  { id: "M001", candidate_name: "Ada Okafor", subject: "Interview change", message: "Hello, I cannot attend my interview on Thursday. Could we move it to Friday afternoon?" },
  { id: "M002", candidate_name: "David Chen", subject: "Link problem and schedule", message: "My interview link is broken, and I also cannot make tomorrow. Can we move it to Friday?" },
  { id: "M003", candidate_name: "Sarah James", subject: "Hiring outcome", message: "Did I get the job? Nobody has contacted me yet." },
  { id: "M004", candidate_name: "Grace Bello", subject: "Application update", message: "I submitted my application last week. Is there an update?" },
  { id: "M005", candidate_name: "Fatima Yusuf", subject: "Resume upload", message: "I am unable to upload my CV; it says file not accepted." },
  { id: "M006", candidate_name: "Chidi Okoro", subject: "Withdrawal request", message: "I would like to withdraw my application from the hiring process." },
];

export const SAMPLE_NAME = "Synthetic sample · 6 rows";

// "Test invalid rows" in the prototype: the sample plus an empty message and a duplicate ID.
export const INVALID_SAMPLE_ROWS: readonly RawRow[] = [
  ...SAMPLE_ROWS,
  { id: "M007", candidate_name: "Sample Row", subject: "Missing message", message: "" },
  { id: "M001", candidate_name: "Duplicate", subject: "Duplicate ID", message: "Please call me." },
];

export const INVALID_SAMPLE_NAME = "Synthetic validation sample · 8 rows";
