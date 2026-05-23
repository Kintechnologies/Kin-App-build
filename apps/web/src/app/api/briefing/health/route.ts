/**
 * GET /api/briefing/health
 *
 * Reliability health check for the morning-briefing system. Verifies four
 * things and returns structured pass/fail JSON for each:
 *   - edgeFunction: the morning-briefing edge function is deployed + reachable
 *   - twilio:       Twilio credentials are valid (account lookup, status active)
 *   - supabase:     the Supabase connection works (live query)
 *   - cron:         the cron job has fired recently (a briefing in the last 25h)
 *
 * Returns 200 when every check passes, 503 when any fails. On failure it also
 * fires a critical Slack alert so a human is paged without polling this route.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifySlack } from "@/lib/notify";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

interface Check {
  pass: boolean;
  detail: string;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function checkEdgeFunction(): Promise<Check> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { pass: false, detail: "NEXT_PUBLIC_SUPABASE_URL not set" };
  const url = `${base}/functions/v1/morning-briefing`;
  try {
    // The function only accepts POST (405 for GET) — any HTTP response proves
    // it is deployed and reachable. Only a network error is a real failure.
    const res = await fetch(url, { method: "GET" });
    return { pass: true, detail: `reachable (HTTP ${res.status})` };
  } catch (err) {
    return { pass: false, detail: `unreachable: ${errMsg(err)}` };
  }
}

async function checkTwilio(): Promise<Check> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { pass: false, detail: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set" };
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
      }
    );
    if (!res.ok) {
      return { pass: false, detail: `account lookup failed (HTTP ${res.status})` };
    }
    const data = await res.json();
    return {
      pass: data.status === "active",
      detail: `account status: ${data.status ?? "unknown"}`,
    };
  } catch (err) {
    return { pass: false, detail: `lookup error: ${errMsg(err)}` };
  }
}

async function checkSupabase(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Check> {
  try {
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) return { pass: false, detail: error.message };
    return { pass: true, detail: "query ok" };
  } catch (err) {
    return { pass: false, detail: errMsg(err) };
  }
}

async function checkCron(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Check> {
  // Proxy for "the cron fired recently": briefings run daily, so the most
  // recent morning_briefings row should be within the last 25h.
  try {
    const { data, error } = await supabase
      .from("morning_briefings")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { pass: false, detail: error.message };
    if (!data) return { pass: false, detail: "no briefings ever recorded" };
    const ageMs = Date.now() - new Date(data.created_at).getTime();
    const ageHours = Math.round(ageMs / 3_600_000);
    return {
      pass: ageMs < 25 * 3_600_000,
      detail: `last briefing recorded ${ageHours}h ago`,
    };
  } catch (err) {
    return { pass: false, detail: errMsg(err) };
  }
}

export async function GET(request: Request) {
  // P1-A4 (audit v7): this route makes Twilio + Supabase calls and triggers
  // Slack alerts on failure. Unauthenticated callers could spam the channel
  // and burn Twilio/Supabase quota. Gate it behind the same Bearer token used
  // by the other cron/monitoring routes.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [edgeFunction, twilio, supabaseCheck, cron] = await Promise.all([
    checkEdgeFunction(),
    checkTwilio(),
    checkSupabase(supabase),
    checkCron(supabase),
  ]);

  const checks = { edgeFunction, twilio, supabase: supabaseCheck, cron };
  const allPass = Object.values(checks).every((c) => c.pass);

  if (!allPass) {
    const failed = Object.entries(checks)
      .filter(([, c]) => !c.pass)
      .map(([name, c]) => `${name}: ${c.detail}`)
      .join("; ");
    await notifySlack(`Briefing health check FAILED — ${failed}`, "critical");
  }

  return NextResponse.json(
    {
      status: allPass ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allPass ? 200 : 503 }
  );
}
