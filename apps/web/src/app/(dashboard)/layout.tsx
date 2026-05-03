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
      <style>{`
        @media (max-width: 900px) {
          .kin-dashboard-shell { flex-direction: column !important; }
          .kin-dashboard-main { display: flex; flex-direction: column; min-width: 100%; }
        }
      `}</style>
    </div>
  );
}
