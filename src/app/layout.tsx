import type { Metadata, Viewport } from "next";
import "@/styles/hifi-v1.1.css";
import "@/styles/ui-06a-accessibility.css"; // UI-06A: focus-state overrides only, loaded after the frozen sheet

export const metadata: Metadata = {
  title: "Candidate Inbox — Hi-fi V1.1 | MUST Quest Concept",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div id="globalLive" className="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      </body>
    </html>
  );
}
