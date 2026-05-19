// cron-dispatch — proxies the sub-daily cron jobs to their Vercel-hosted
// Next.js routes.
//
// The Vercel Hobby plan only allows daily cron schedules, so the three
// sub-daily jobs run as pg_cron schedules instead (see migration
// 058_subdaily_crons.sql). pg_cron POSTs here with ?job=<name>; this function
// forwards the call to the matching Next.js cron route.
//
// Those routes authenticate with a Bearer token (see lib/cron-auth.ts). They
// accept the project's service-role key, which Supabase auto-injects into this
// function as SUPABASE_SERVICE_ROLE_KEY — so no extra secret has to be
// provisioned. pg_cron itself needs no auth: verify_jwt = false for this
// function (see config.toml), matching the morning-briefing pattern.
//
// Optional env:
//   APP_URL — Vercel deployment origin; defaults to https://kinai.family.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://kinai.family";

// job name → Next.js cron route (path + any query string).
const ROUTES: Record<string, string> = {
  "pickup-risk": "/api/cron/pickup-risk",
  "sunday-checkin": "/api/cron/sunday-checkin",
  "engagement-nudges-onboarding": "/api/cron/engagement-nudges?mode=onboarding",
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

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // The Next.js cron routes are all GET + Bearer-authenticated.
  const upstream = await fetch(`${APP_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${serviceRoleKey}` },
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
