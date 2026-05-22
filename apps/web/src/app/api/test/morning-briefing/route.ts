/**
 * Test-only endpoint: fire a single-user morning briefing on demand.
 *
 * Three morning-briefing routes exist; do not confuse them:
 *
 *   /api/morning-briefing           ← user-facing on-demand briefing for the
 *                                     authenticated web dashboard user
 *   /api/cron/morning-briefing      ← legacy Vercel cron fan-out (SMS briefings
 *                                     now fan out from a Supabase edge function
 *                                     in per-user local time)
 *   /api/test/morning-briefing      ← THIS FILE: single-phone dev test, gated
 *                                     by CRON_SECRET, defaults to a dry run
 *
 * Audit v4 P0-6: this route now proxies the call to the morning-briefing edge
 * function (single-profile test mode), so the founder test path and the 6am
 * production path execute the SAME briefing code. A previous Node-side copy of
 * the SMS briefing generator (apps/web/src/lib/sms-briefing.ts) had drifted
 * from the edge function and was leaking private event titles; that file is
 * gone, and drift is now structurally impossible.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 *
 * GET /api/test/morning-briefing?phone=+1XXXXXXXXXX[&send=true]
 *   phone — required; target profile's phone_number
 *   send  — "true" to actually deliver (generates + Twilio + persists +
 *           audit log via the real edge-function delivery pipeline). Default
 *           is a dry run: generation only, no Twilio, no DB writes.
 *
 * The persist=true legacy param is gone: the edge function persists iff send
 * is true (same as the production path). Carrying two flags here would just
 * re-create the drift we're trying to kill.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function GET(request: Request) {
  // V6 P1-I3: prefer TEST_SECRET — the dedicated, lowest-privileged credential
  // for the test endpoints. Fall back to CRON_SECRET so a deploy that hasn't
  // rotated yet keeps working, but rotate ASAP. The fallback log surfaces in
  // Vercel logs so we can see when it's still in use.
  const authHeader = request.headers.get("authorization") ?? "";
  const testSecret = process.env.TEST_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const acceptedTest =
    testSecret && safeEqual(authHeader, `Bearer ${testSecret}`);
  const acceptedCron =
    cronSecret && safeEqual(authHeader, `Bearer ${cronSecret}`);
  if (!acceptedTest && !acceptedCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!acceptedTest && acceptedCron) {
    console.warn(
      "/api/test/morning-briefing accepted CRON_SECRET — set TEST_SECRET to silence this fallback."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL is not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  const send = url.searchParams.get("send") === "true";

  if (!phone) {
    return NextResponse.json(
      { error: "Missing required query param: phone" },
      { status: 400 }
    );
  }

  // Forward to the edge function's single-profile test mode. The function's
  // handler validates CRON_SECRET via the x-cron-secret header — that remains
  // the credential between the two server-side trust boundaries; only the
  // public-facing entry to this Next route is gated by TEST_SECRET. (V6 P1-I3)
  if (!cronSecret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is required to forward to the morning-briefing edge function",
      },
      { status: 500 }
    );
  }
  const start = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(`${supabaseUrl}/functions/v1/morning-briefing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      body: JSON.stringify({
        target_phone: phone,
        dry_run: !send,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to reach morning-briefing edge function",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }

  const elapsed = Date.now() - start;
  const text = await upstream.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  return NextResponse.json(
    {
      ...(parsed as Record<string, unknown>),
      proxy_latency_ms: elapsed,
    },
    { status: upstream.status }
  );
}
