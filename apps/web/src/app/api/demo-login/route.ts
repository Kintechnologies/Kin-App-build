/**
 * POST /api/demo-login
 *
 * Signs the caller in as the seeded demo account without exposing the
 * credentials in the client bundle.
 *
 * P1-A1 (audit v7): V6 P2-L3 shipped demo@kinai.family / KinDemo2026!
 * hardcoded into the React bundle on /signin?demo=true so beta evaluators
 * could land in the seeded household without an emailed password. That
 * comment promised the prefill would move before signup opened to the
 * public — that gate has arrived. The credentials now live in env vars
 * (DEMO_EMAIL, DEMO_PASSWORD); this route signs the user in via the
 * Supabase SSR client (so cookies land on the response) and returns
 * success. The dashboard takes over from there. Rate-limited by IP and
 * gated by isSameOrigin so the route is not a generic credential-stuffing
 * surface.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/csrf";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return `demo-login:${fwd.split(",")[0].trim()}`;
  return "demo-login:unknown";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const rl = await checkRateLimit(clientKey(request), "demo-login");
  if (!rl.allowed) return rateLimitResponse(rl);

  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Demo account is not configured." },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    Sentry.captureException(new Error(`demo-login: ${error.message}`));
    return NextResponse.json(
      { error: "Demo sign-in failed. Try again shortly." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
