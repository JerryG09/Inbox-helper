// The three approved screens (contract §1). Processing is a state of Import, not a view.
export type View = "import" | "inbox" | "results";

export const VIEWS: readonly View[] = ["import", "inbox", "results"];

// Header copy per view, verbatim from render() in the approved V1.1 HTML.
export const VIEW_HEADINGS: Record<View, { breadcrumb: string; title: string; sub: string }> = {
  import: { breadcrumb: "01 / Intake", title: "Import candidate messages", sub: "Validate first. Process only valid candidate records." },
  inbox: { breadcrumb: "02 / Work queue", title: "Inbox & human review", sub: "Organize by primary intent, inspect exceptions, and approve only after review." },
  results: { breadcrumb: "03 / Outcome", title: "Batch results & export", sub: "See exact AI-processing and human-review outcomes." },
};
