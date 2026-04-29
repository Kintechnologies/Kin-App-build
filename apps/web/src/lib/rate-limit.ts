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
 *   chat            → 10 req / 1 min  (per user)
 *   morning-briefing → 1 req / 1 day  (per user)
 *   first-use        → 5 req / lifetime — approximated as 5 req / 365 days
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type RouteKey = "chat" | "morning-briefing" | "first-use" | "sms";

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
    // 20 inbound SMS per hour per phone number — prevents API drain from a single number
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(20, "1 h"),
      prefix: "rl:sms",
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
    // Upstash not configured — allow all requests
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
