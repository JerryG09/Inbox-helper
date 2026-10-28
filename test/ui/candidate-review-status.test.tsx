import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CandidateReview } from "@/components/CandidateReview";
import type { InboxRecord } from "@/lib/domain/types";

afterEach(cleanup);

const base: InboxRecord = {
  key: "b1:r2", importedId: "M001", candidateName: "Ada Okafor", subject: "Interview change", message: "Synthetic.",
  processing: "queued", secondaryIntents: [], attention: "none", currentAttentionReasons: [], historicalAiFindings: [], needsRecheck: false,
};
const noop = () => {};
const show = (r: InboxRecord) => render(
  <CandidateReview r={r} editedSinceRender={false} onBackToList={noop} onNextPending={noop} onRetry={noop}
    onPrimary={noop} onSecondary={noop} onDraft={noop} onRecheck={noop} onApprove={noop} onReject={noop} />,
);
const QUEUED = "Queued for processing. No review actions are available.";
const PROCESSING = "Processing this message. No review actions are available until processing finishes.";

// UX-05A-01: Queued and Processing are distinct, provider-neutral, and exposed as a polite status.
describe("in-flight status notice (UX-05A-01)", () => {
  it("Queued keeps the approved V1.1 wording", () => {
    show(base);
    expect(screen.getByRole("status").textContent).toBe(QUEUED);
    expect(screen.queryByText(PROCESSING)).toBeNull();
  });
  it("Processing has its own wording, never 'Queued'", () => {
    show({ ...base, processing: "processing" });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(PROCESSING);
    expect(status.className).toBe("notice mt");
    expect(status.getAttribute("aria-live")).toBeNull(); // implicit polite via role=status; no assertive alert
    expect(screen.queryByText(/Queued/)).toBeNull();
    expect(PROCESSING).not.toMatch(/simulat|anthropic|claude|model|\bAI\b/i);
  });
  it("completed and failed records show no in-flight notice", () => {
    show({ ...base, processing: "failed", error: { code: "x", description: "Simulated AI provider timeout" } });
    expect(screen.queryByText(QUEUED)).toBeNull();
    expect(screen.queryByText(PROCESSING)).toBeNull();
    cleanup();
    show({ ...base, processing: "completed", primaryIntent: "application_status", review: "pending", aiSummary: "s", originalAiDraft: "d", currentDraft: "d" });
    expect(screen.queryByText(QUEUED)).toBeNull();
    expect(screen.queryByText(PROCESSING)).toBeNull();
  });
});
