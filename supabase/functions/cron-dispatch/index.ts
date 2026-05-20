// cron-dispatch — proxies the sub-daily cron jobs to their Vercel-hosted
// Next.js routes.
//
// The Vercel Hobby plan only allows daily cron schedules, so the three
// sub-daily jobs run as pg_cron schedules instead (see migration
// 058_subdaily_crons.sql). pg_cron POSTs here with ?job=<name>; this function
// forwards the call to the matching Next.js cron route.
//
// Those routes authenticate with a Bearer token (see lib/cron-auth.ts). The
// only accepted credential is CRON_SECRET — set the same value in both this
// function's secrets and in the web app. pg_cron itself needs no auth:
// verify_jwt = false for this function (see config.toml), matching the
// morning-briefing pattern.
//
// Required env:
//   CRON_SECRET — shared with the web app; matched by lib/cron-auth.ts.
// Optional env:
//   APP_URL — Vercel deployment origin; defaults to https://kinai.family.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://kinai.family";

// job name → Next.js cron route (path + any query string).
const ROUTES: Record<string, string> = {
  "pickup-risk": "/api/cron/pickup-risk",
  "sunday-checkin": "/api/cron/sunday-checkin",
  "engagement-nudges-onboarding": "/api/cron/engagement-nudges?mode=onboarding",
  "calendar-renewal": "/api/cron/calendar-renewal",
};

serve(async (req) => {
  const job = new URL(req.url).searchParams.get("job") ?? "";
  const path = ROUTES[job];

  if (!path) {
    return new Response(
      JSON.stringify({ error: `unknown job: ${job || "(none)"}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // The Next.js cron routes are all GET + Bearer-authenticated.
  const upstream = await fetch(`${APP_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
});
