import { redirect } from "next/navigation";

// Default landing matches the SidebarNav order (audit V7 P2-D5).
// SidebarNav lists Household → Calendars → Payments → Settings, so the
// /dashboard root should land on Household, not Settings.
export default function DashboardIndex() {
  redirect("/dashboard/family");
}
