import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/waitlist
 * Public endpoint — no auth required.
 * Accepts an email address and adds it to the `waitlist` table.
 *
 * Body: { email: string; source?: string }
 *
 * Returns:
 *   201 { success: true }              — newly added
 *   200 { success: true, existing: true } — already on the list
 *   400 { error: string }              — invalid input
 *   503 { error: string }              — service unavailable (env missing)
 *   500 { error: string }              — unexpected error
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; source?: string };

    const email = body.email?.trim().toLowerCase();
    const source = body.source?.trim() ?? "landing_page";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic format check — DB constraint provides the definitive check
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      // Admin client throws when env vars are missing
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const { error } = await supabase.from("waitlist").insert({ email, source });

    if (error) {
      // Unique constraint violation — already on the list
      if (error.code === "23505") {
        return NextResponse.json({ success: true, existing: true }, { status: 200 });
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[waitlist] insert error:", error);
      }
      // TODO: log to Sentry before GA
      return NextResponse.json({ error: "Could not save your email" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    // TODO: log to Sentry before GA
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
