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
      <Suspense fallback={null}>
        <SidebarNav />
      </Suspense>
      <main
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
        P2-D2 (audit v6): the 900px breakpoint below collapses the sidebar
        into a stacked column so the dashboard is at least usable on phones.
        It has NOT been QA'd against every dashboard subpage on real iPhone
        SE / Pixel 7 viewports — known suspects:
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
      `}</style>
    </div>
  );
}
