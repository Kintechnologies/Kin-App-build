import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Desktop sidebar will go here in a future step */}
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
