// UI-00 reference integrity: the frozen V1.1 bundle and its extracted files must match the recorded SHA-256 values.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const BUNDLE = "reference/MUST-Inbox-Helper-HiFi-V1.1-APPROVED-REFERENCE-BUNDLE.zip";
const BUNDLE_SHA256 = "ca95b29dbd0977bd159a7a0d78c5526cb0c7e23ccae58ff0133605b8a3aefdff"; // from handoff README-FIRST.md
const ROOT = "reference/hifi-v1.1";

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${ok ? "" : ` (expected ${expected}, got ${actual})`}`);
};

check(BUNDLE, sha256(BUNDLE), BUNDLE_SHA256);
for (const line of readFileSync(path.join(ROOT, "SHA256SUMS.txt"), "utf8").trim().split("\n")) {
  const [hash, file] = line.trim().split(/\s+/);
  check(path.join(ROOT, file), sha256(path.join(ROOT, file)), hash);
}

if (failures) {
  console.error(`${failures} reference file(s) failed integrity check.`);
  process.exit(1);
}
console.log("Reference integrity verified.");
