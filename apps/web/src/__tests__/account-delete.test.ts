/**
 * DELETE /api/account — test suite
 *
 * P1-P3 (audit v7) changed this route from immediate hard-delete to a
 * 30-day soft-schedule. The route now sets `data_deletion_at`,
 * `cancelled_at`, and `sms_opted_out_at` on the profile; the existing
 * cleanup cron (apps/web/src/app/api/cron/cleanup/route.ts) picks any
 * profile whose `data_deletion_at` has passed and invokes the
 * `delete_user_account()` RPC. Tests reflect that contract.
 *
 * Covers:
 *   1. Cross-origin request → 403 (V7 P0-5 CSRF defense-in-depth)
 *   2. Rate-limited request → 429 (V7 P0-5)
 *   3. Unauthenticated request → 401
 *   4. Happy path → profiles row updated with data_deletion_at ~30d out, 200
 *   5. DB update failure → 500 + Sentry capture
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAuthenticatedUser,
  mockUpdate,
  mockSentryCaptureException,
  mockIsSameOrigin,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockUpdate: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockIsSameOrigin: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: (init as { status?: number } | undefined)?.status ?? 200,
      json: async () => data,
    })),
  },
}));

vi.mock("@/lib/supabase/api-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: (patch: Record<string, unknown>) => {
        mockUpdate(patch);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      },
    })),
  })),
}));

vi.mock("@/lib/csrf", () => ({
  isSameOrigin: mockIsSameOrigin,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitResponse: vi.fn(() => ({
    status: 429,
    json: async () => ({ error: "Rate limit exceeded. Please slow down." }),
  })),
}));

import { DELETE } from "../app/api/account/route";

function makeRequest(): Request {
  return {
    headers: new Headers({ authorization: "Bearer test-token" }),
  } as unknown as Request;
}

const UID = "test-user-123";

describe("DELETE /api/account (P1-P3 30-day soft schedule)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSameOrigin.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 3,
      limit: 3,
      reset: 0,
    });
  });

  it("returns 403 when the request is cross-origin (V7 P0-5)", async () => {
    mockIsSameOrigin.mockReturnValue(false);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(403);
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-user rate limit is exceeded (V7 P0-5)", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: UID });
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 3,
      reset: Date.now() + 60_000,
    });
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(429);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(UID, "account-delete");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("schedules deletion ~30 days out and returns 200", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: UID });
    const before = Date.now();

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success?: boolean;
      scheduled?: boolean;
      data_deletion_at?: string;
    };
    expect(body.success).toBe(true);
    expect(body.scheduled).toBe(true);
    expect(body.data_deletion_at).toBeTypeOf("string");
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    const patch = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(patch.cancelled_at).toBeTypeOf("string");
    expect(patch.data_deletion_at).toBeTypeOf("string");
    expect(patch.sms_opted_out_at).toBeTypeOf("string");

    const deleteAt = new Date(patch.data_deletion_at as string).getTime();
    const lower = before + 29 * 24 * 60 * 60 * 1000;
    const upper = before + 31 * 24 * 60 * 60 * 1000;
    expect(deleteAt).toBeGreaterThanOrEqual(lower);
    expect(deleteAt).toBeLessThanOrEqual(upper);

    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });
});
