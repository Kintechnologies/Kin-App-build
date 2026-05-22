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
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAuthenticatedUser,
  mockRpc,
  mockDeleteUser,
  mockSentryCaptureException,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockRpc: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockSentryCaptureException: vi.fn(),
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
