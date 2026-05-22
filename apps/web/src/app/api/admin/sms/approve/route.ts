/**
 * Admin SMS access control.
 *
 *   POST /api/admin/sms/approve   — promote a number to the approved allowlist
 *   GET  /api/admin/sms/approve   — list numbers still waiting on the SMS waitlist
 *
 * Auth: a Bearer token in the Authorization header, matched against ADMIN_SECRET.
 * The gating tables are service-role only, so this route is the supported way
 * for an admin to work the SMS waitlist. ADMIN_SECRET is a dedicated admin
 * credential — it intentionally does not fall back to CRON_SECRET so that
 * compromising the scheduler does not also grant admin access.
 *
 * POST body: { phone: string, note?: string, notify?: boolean }
 *   - phone   accepts loose input ("(415) 555-0117"); normalized to E.164.
 *   - note    optional free-text recorded on the approval row.
 *   - notify  defaults true — texts the number APPROVED_MESSAGE so the
 *             "we'll text you when it's your turn" promise is kept.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { approveNumber, normalizePhone, APPROVED_MESSAGE } from "@/lib/sms-access";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function authorize(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error("admin/sms/approve: ADMIN_SECRET is not set");
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone?: string; note?: string; notify?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!phone) {
    return NextResponse.json(
      { error: "A valid phone number is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  await approveNumber(supabase, phone, {
    approvedBy: "admin_api",
    note: body.note ?? null,
  });

  // Keep the waitlist promise. Best-effort: a Twilio failure must not fail the
  // approval — the number is approved regardless and can text in to onboard.
  // TCPA: never text a number that opted out, even when the admin clicks approve.
  let notified = false;
  let optedOut = false;
  if (body.notify !== false) {
    const [{ data: waitlistRow }, { data: profileRow }] = await Promise.all([
      supabase
        .from("sms_waitlist")
        .select("sms_opted_out_at")
        .eq("phone_number", phone)
        .maybeSingle<{ sms_opted_out_at: string | null }>(),
      supabase
        .from("profiles")
        .select("sms_opted_out_at")
        .eq("phone_number", phone)
        .maybeSingle<{ sms_opted_out_at: string | null }>(),
    ]);
    optedOut =
      Boolean(waitlistRow?.sms_opted_out_at) ||
      Boolean(profileRow?.sms_opted_out_at);

    if (!optedOut) {
      try {
        await sendSms(phone, APPROVED_MESSAGE);
        notified = true;
      } catch (err) {
        console.error("admin/sms/approve: notification SMS failed:", err);
      }
    }
  }

  return NextResponse.json({ approved: phone, notified, optedOut });
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sms_waitlist")
    .select("phone_number, first_message, message_count, created_at, last_texted_at")
    .is("approved_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pending: data ?? [], count: data?.length ?? 0 });
}
