import type { ReactNode } from "react";
import { VIEW_HEADINGS, type View } from "@/lib/domain/views";
import { useRuntimeMode } from "./RuntimeMode";

type Props = {
  view: View;
  onNavigate: (view: View) => void;
  onReset: () => void;
  children: ReactNode;
};

// Desktop navy sidebar / mobile top navigation. DOM and class names carried over from the approved V1.1 HTML.
export function AppShell({ view, onNavigate, onReset, children }: Props) {
  const heading = VIEW_HEADINGS[view];
  const navClass = (v: View) => (view === v ? "active" : undefined);
  const mode = useRuntimeMode();
  // UX-AI-01: mode-truthful copy in the existing sidebar note, header badge and footer. Simulated copy is V1.1 verbatim.
  const copy = mode.kind === "anthropic"
    ? { note: "LIVE AI · ANTHROPIC", fine: `Synthetic data only · ${mode.model}`, badge: "Live Anthropic AI", footer: `Live AI mode · messages you process are sent to Anthropic (${mode.model}) to classify them and draft suggested replies. Nothing is sent to candidates; no email, ATS, authentication, database, or permanent storage. Use synthetic data only.` }
    : mode.kind === "unavailable"
      ? { note: "LIVE AI UNAVAILABLE", fine: "Server not configured for Anthropic", badge: "Live AI unavailable", footer: "Live AI mode is selected but unavailable on this server · no model output and no simulated results will be shown. No email, ATS, authentication, database, or permanent storage." }
      : null;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-wrap">
          <div className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 34 34" width="34" height="34" fill="none">
              <rect x="3" y="3" width="12" height="12" rx="3" fill="#7D8AFF" />
              <rect x="19" y="3" width="12" height="12" rx="3" fill="#A3F0D6" />
              <rect x="3" y="19" width="12" height="12" rx="3" fill="#A3F0D6" />
              <rect x="19" y="19" width="12" height="12" rx="3" fill="#7D8AFF" />
            </svg>
          </div>
          <div className="brand-type">
            <strong>inbox<span>flow</span></strong>
            <small>AI-assisted recruiting</small>
          </div>
        </div>
        <div className="side-section-label">WORKSPACE</div>
        <nav className="nav" aria-label="Main views">
          <button id="nav-import" className={navClass("import")} onClick={() => onNavigate("import")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4l4 4" /><path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>
            <span>Import messages</span><span className="nav-step">01</span>
          </button>
          <button id="nav-inbox" className={navClass("inbox")} onClick={() => onNavigate("inbox")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 14h5l2 3h4l2-3h5" /></svg>
            <span>Inbox & review</span><span className="nav-step">02</span>
          </button>
          <button id="nav-results" className={navClass("results")} onClick={() => onNavigate("results")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4v16h16" /><path d="m7 15 4-4 3 2 5-7" /></svg>
            <span>Batch results</span><span className="nav-step">03</span>
          </button>
        </nav>
        <div className="side-bottom">
          <div className="safety-note">
            <div className="safety-icon" aria-hidden="true">✓</div>
            <div><strong>Human stays in control</strong><p>Drafts are never sent automatically.</p></div>
          </div>
          {copy
            ? <div className="sidebar-note"><span className="small-dot"></span>{` ${copy.note}`}<br /><span className="side-fine">{copy.fine}</span></div>
            : <div className="sidebar-note"><span className="small-dot"></span> INTERACTIVE DESIGN PROTOTYPE<br /><span className="side-fine">Local synthetic data · Mock AI only</span></div>}
        </div>
      </aside>
      <main className="main"><div className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow" id="breadcrumb">{heading.breadcrumb}</div>
            <h1 id="pageTitle">{heading.title}</h1>
            <p className="sub" id="pageSub">{heading.sub}</p>
          </div>
          <div className="actions header-actions">
            <span className="badge draft-badge" id="modeBadge"><span className="small-dot"></span>{copy ? ` ${copy.badge}` : " Interactive concept"}</span>
            <button className="btn small reset-btn" onClick={onReset} title="Clear local prototype state">↺ Reset demo</button>
          </div>
        </header>
        <div className="intro-strip"><span className="intro-spark">✦</span><span><strong>Your co-pilot for candidate conversations.</strong> AI sorts and drafts. You make every final decision.</span><span className="intro-no-send">No messages sent</span></div>
        {children}
        <footer className="footer">{copy ? copy.footer : "Hi-fi design prototype · no real AI, network call, authentication, database, email, or permanent storage. All characters and messages are fictional."}</footer>
      </div></main>
    </div>
  );
}
