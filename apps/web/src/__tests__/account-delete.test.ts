/**
 * DELETE /api/account — test suite
 *
 * The route now delegates the entire data-side delete to the Postgres
 * function `public.delete_user_account(uid uuid)` (migration 070), then
 * issues `auth.admin.deleteUser` only after that RPC succeeds. This rewrite
 * targets the new shape; the pre-V5 ordering tests don't apply because the
 * tx runs atomically inside the DB function.
 *
 * Covers:
 *   1. Unauthenticated request → 401
 *   2. Happy path → RPC called with the actor's uid, auth deleted, 200
 *   3. RPC failure → auth NOT deleted, 500 + Sentry capture
 *   4. Auth-delete failure (RPC succeeded) → 500 + Sentry capture
 *   5. Cross-origin request → 403 (V7 P0-5 CSRF defense-in-depth)
 *   6. Rate-limited request → 429 (V7 P0-5 rate-limit defense-in-depth)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAuthenticatedUser,
  mockRpc,
  mockDeleteUser,
  mockSentryCaptureException,
  mockIsSameOrigin,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockRpc: vi.fn(),
  mockDeleteUser: vi.fn(),
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
    rpc: mockRpc,
    auth: { admin: { deleteUser: mockDeleteUser } },
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

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    mockDeleteUser.mockResolvedValue({ error: null });
    // Default to "trusted" (same-origin, under rate limit) so existing tests
    // exercise the original behavior. Individual tests override these to
    // exercise the V7 P0-5 defense-in-depth checks.
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
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
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
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("invokes delete_user_account RPC then deletes the auth row, returns 200", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: UID });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_user_account", { uid: UID });
    expect(mockDeleteUser).toHaveBeenCalledWith(UID);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("does NOT delete the auth row when the RPC fails — atomic guarantee", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: UID });
    mockRpc.mockResolvedValue({
      error: { message: "delete_user_account exploded" },
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    expect(mockRpc).toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockSentryCaptureException).toHaveBeenCalled();
  });

  it("captures to Sentry when auth-delete fails after a successful RPC", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: UID });
    mockDeleteUser.mockResolvedValue({
      error: { message: "auth.users delete blew up" },
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    expect(mockRpc).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalled();
    // Two captures: the post-tx Sentry breadcrumb + the outer catch.
    expect(mockSentryCaptureException).toHaveBeenCalled();
  });
});
