/**
 * Rate limiting utility — BACKLOG-007
 *
 * Uses Upstash Redis + @upstash/ratelimit for per-user sliding-window counters.
 * Gracefully degrades (allows the request) when UPSTASH env vars are absent so
 * development and CI never break.
 *
 * Usage:
 *   const result = await checkRateLimit(userId, "chat");
 *   if (!result.allowed) return rateLimitResponse(result);
 *
 * Limits:
 *   chat             → 10 req / 1 min   (per user)
 *   morning-briefing → 1 req / 1 day    (per user)
 *   first-use        → 5 req / lifetime — approximated as 5 req / 365 days
 *   sms              → 10 inbound / 1 h (per phone)
 *   invite-accept    → 5 req / 1 min    (per user — defeats invite-code enumeration)
 *   ops-metrics      → 60 req / 1 min   (per uid — defense-in-depth on founder dash)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type RouteKey =
  | "chat"
  | "morning-briefing"
  | "first-use"
  | "sms"
  | "invite-accept"
  | "ops-metrics"
  | "invite-create"
  | "invite-lookup"
  | "stripe-checkout"
  | "stripe-portal"
  | "onboarding-complete";

// Lazily initialise Redis + limiters only when env vars are present.
let redis: Redis | null = null;
const limiters: Partial<Record<RouteKey, Ratelimit>> = {};

function getRedis(): Redis | null {
  if (redis !== null) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(route: RouteKey): Ratelimit | null {
  if (limiters[route]) return limiters[route]!;
  const r = getRedis();
  if (!r) return null;

  let limiter: Ratelimit;
  if (route === "chat") {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:chat",
    });
  } else if (route === "morning-briefing") {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(1, "1 d"),
      prefix: "rl:morning-briefing",
    });
  } else if (route === "sms") {
    // 10 inbound SMS per hour per phone number — caps Claude spend per user-hour
    // for the beta cohort. Lowered from 20 in audit v3 P1-S2.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:sms",
    });
  } else if (route === "invite-accept") {
    // 5 invite-code submissions per minute per authenticated user — defeats
    // brute-force enumeration of short invite codes by a logged-in attacker.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:invite-accept",
    });
  } else if (route === "ops-metrics") {
    // Founder /ops dashboard polls every few seconds; 60/min is generous headroom
    // for a single admin browser. Defense-in-depth on top of phone-list gating.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:ops-metrics",
    });
  } else if (route === "invite-create") {
    // 3 partner-invite SMS dispatches per user per day — a paying user shouldn't
    // be paging arbitrary phone numbers via our Twilio account.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(3, "1 d"),
      prefix: "rl:invite-create",
    });
  } else if (route === "invite-lookup") {
    // 30 GET /api/invite/[code] lookups per IP per minute — defeats casual
    // enumeration of 64-bit codes while leaving room for an honest user
    // reloading the accept page a few times.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:invite-lookup",
    });
  } else if (route === "stripe-checkout") {
    // 5 Stripe checkout-session creations per user per minute — bounds
    // promotion-code probing and prevents accidental loops from inflating
    // our Stripe call volume.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:stripe-checkout",
    });
  } else if (route === "stripe-portal") {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:stripe-portal",
    });
  } else if (route === "onboarding-complete") {
    // The route is welcome-SMS-latched, but each call still costs a profile
    // read and a Twilio send for the unlatched edge cases.
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:onboarding-complete",
    });
  } else {
    // first-use: 5 requests per 365 days (effectively lifetime)
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "365 d"),
      prefix: "rl:first-use",
    });
  }
  limiters[route] = limiter;
  return limiter;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number; // unix timestamp ms when window resets
}

/**
 * Check whether `userId` is within the rate limit for `route`.
 * Returns `{ allowed: true }` when Upstash is not configured (graceful degrade).
 */
export async function checkRateLimit(
  userId: string,
  route: RouteKey
): Promise<RateLimitResult> {
  const limiter = getLimiter(route);
  if (!limiter) {
    // In prod, a missing rate-limit backend is a config error, not an excuse
    // to flood every gated endpoint. Fail closed so we notice immediately
    // instead of discovering it during an incident.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "rate-limit: Upstash not configured in production — rejecting request"
      );
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reset: Date.now() + 60_000,
      };
    }
    // Dev/test: allow all so local work isn't blocked.
    return { allowed: true, remaining: Infinity, limit: Infinity, reset: 0 };
  }

  const { success, remaining, limit, reset } = await limiter.limit(userId);
  return { allowed: success, remaining, limit, reset };
}

/**
 * Returns a standard 429 response with Retry-After and X-RateLimit-* headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.ceil((result.reset - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Rate limit exceeded. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfterSec, 1)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
