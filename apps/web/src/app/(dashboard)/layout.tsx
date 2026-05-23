import { Suspense } from "react";
import SidebarNav from "@/components/layout/SidebarNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="kin-dashboard-shell"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--warm)",
        display: "flex",
        flexDirection: "row",
        fontFamily:
          "var(--font-geist-sans), Geist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/*
        Skip-to-content anchor (audit V7 P2-A8 / WCAG 2.4.1 Bypass Blocks).
        Hidden until keyboard-focused — gives screen-reader and keyboard
        users a way past the sidebar nav on every dashboard subpage.
      */}
      <a href="#kin-dashboard-content" className="kin-skip-link">
        Skip to main content
      </a>
      <Suspense fallback={null}>
        <SidebarNav />
      </Suspense>
      <main
        id="kin-dashboard-content"
        className="kin-dashboard-main"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          paddingTop: 0,
        }}
      >
        {children}
      </main>
      {/*
        P2-D2 (audit v6) / P2-D9 (audit v7): the 900px breakpoint below
        collapses the sidebar into a stacked column so the dashboard is at
        least usable on phones. It has STILL not been QA'd on real iPhone
        SE / Pixel 7 hardware — V7 re-flagged the gap. Known suspects:
          • family/page.tsx invite row uses `flex 1 1 200px` which can wrap
            awkwardly between the input and Send Invite button;
          • billing/page.tsx pricing card uses fixed 640px max-width that
            already shrinks fine, but the renewal-date copy can wrap two
            lines on a 320px viewport;
          • calendars/page.tsx connection card has the disconnect/reconnect
            buttons in a row that may overflow on narrow screens.
        Mobile QA is tracked as a follow-up to this audit — when an actual
        phone testing pass happens, raise/refine breakpoints here and on
        the offending pages instead of adding more piecemeal !important.
      */}
      <style>{`
        @media (max-width: 900px) {
          .kin-dashboard-shell { flex-direction: column !important; }
          .kin-dashboard-main { display: flex; flex-direction: column; min-width: 100%; }
        }
        .kin-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          z-index: 1000;
          background: var(--sage);
          color: var(--bg, #F7F3ED);
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 600;
          text-decoration: none;
        }
        .kin-skip-link:focus {
          left: 12px;
          top: 12px;
          outline: 2px solid var(--warm);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
