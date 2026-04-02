import { Suspense } from "react";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
