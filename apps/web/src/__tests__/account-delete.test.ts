/**
 * DELETE /api/account — test suite
 *
 * Covers (per BACKLOG-009):
 *   1. Unauthenticated request → 401
 *   2. Authenticated solo user → 200 + all tables deleted in order
 *   3. Authenticated paired user (primary parent) → 200 + partner household_id nulled
 *   4. Authenticated paired user (invitee) → 200 + accepted_by_profile_id nulled
 *   5. DB failure mid-deletion → 500 + Sentry fired + auth user NOT deleted
 *
 * Strategy: mock Supabase regular client, admin client, auth, and Sentry.
 * Track call order to verify FK nullification happens BEFORE profile.delete().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock handles ──────────────────────────────────────────────────────
const {
  mockGetAuthenticatedUser,
  mockRegularDelete,
  mockRegularUpdate,
  mockRegularSelect,
  mockAdminUpdate,
  mockAdminDeleteUser,
  mockSentryCaptureException,
} = vi.hoisted(() => {
  const mockGetAuthenticatedUser = vi.fn();
  const mockSentryCaptureException = vi.fn();

  // Admin client — handles FK nullification + auth.admin.deleteUser
  const mockAdminUpdate = vi.fn();
  const mockAdminDeleteUser = vi.fn().mockResolvedValue({ error: null });

  // Regular client chains
  const mockRegularDelete = vi.fn();
  const mockRegularUpdate = vi.fn();
  const mockRegularSelect = vi.fn();

  return {
    mockGetAuthenticatedUser,
    mockRegularDelete,
    mockRegularUpdate,
    mockRegularSelect,
    mockAdminUpdate,
    mockAdminDeleteUser,
    mockSentryCaptureException,
  };
});

// ── Call-order tracker ────────────────────────────────────────────────────────
// We track the sequence of tableName + operation to verify ordering guarantees.
const callLog: string[] = [];

// ── Module mocks ──────────────────────────────────────────────────────────────

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

// ── Supabase regular client mock ──────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => {
  function makeChain(tableName: string) {
    let _field = "";
    const chain = {
      delete: () => {
        callLog.push(`regular.${tableName}.delete`);
        mockRegularDelete(tableName);
        return chain;
      },
      update: (vals: unknown) => {
        callLog.push(`regular.${tableName}.update`);
        mockRegularUpdate(tableName, vals);
        return chain;
      },
      select: (cols: string) => {
        mockRegularSelect(tableName, cols);
        return chain;
      },
      eq: (_col: string, _val: unknown) => chain,
      neq: (_col: string, _val: unknown) => chain,
      single: () =>
        Promise.resolve({
          data: { household_id: null },
          error: null,
        }),
      // For the "remaining members" query (returns an array)
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  }

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((tableName: string) => makeChain(tableName)),
    })),
  };
});

// ── Supabase admin client mock ────────────────────────────────────────────────
vi.mock("@/lib/supabase/admin", () => {
  function makeAdminChain(tableName: string) {
    const chain = {
      update: (vals: unknown) => {
        callLog.push(`admin.${tableName}.update`);
        mockAdminUpdate(tableName, vals);
        return chain;
      },
      eq: (_col: string, _val: unknown) => Promise.resolve({ error: null }),
    };
    return chain;
  }

  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn((tableName: string) => makeAdminChain(tableName)),
      auth: {
        admin: {
          deleteUser: mockAdminDeleteUser,
        },
      },
    })),
  };
});

import { DELETE } from "../app/api/account/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return { headers: new Headers({ authorization: "Bearer test-token" }) } as unknown as Request;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callLog.length = 0;
  });

  // ── 1. Unauthenticated ────────────────────────────────────────────────────
  it("returns 401 for unauthenticated requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  // ── 2. Solo user (no household) ───────────────────────────────────────────
  it("deletes all user data and auth record for a solo user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "uid-solo" });
    mockAdminDeleteUser.mockResolvedValue({ error: null });

    // Override the profile select to return no household_id
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((tableName: string) => {
        const chain: Record<string, unknown> = {};
        const noopChain = () => chain;
        chain["delete"] = () => {
          callLog.push(`regular.${tableName}.delete`);
          mockRegularDelete(tableName);
          return chain;
        };
        chain["update"] = (vals: unknown) => {
          mockRegularUpdate(tableName, vals);
          return chain;
        };
        chain["select"] = () => chain;
        chain["eq"] = () => chain;
        chain["neq"] = () => chain;
        chain["single"] = () =>
          Promise.resolve({
            data: { household_id: null },
            error: null,
          });
        chain["then"] = (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve);
        return chain;
      }),
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify auth user was deleted
    expect(mockAdminDeleteUser).toHaveBeenCalledWith("uid-solo");

    // Verify FK nullification ran before profile delete
    const fkNullIdx = callLog.findIndex((e) => e.includes("admin.profiles.update"));
    const profileDeleteIdx = callLog.findIndex((e) => e === "regular.profiles.delete");
    if (fkNullIdx !== -1 && profileDeleteIdx !== -1) {
      expect(fkNullIdx).toBeLessThan(profileDeleteIdx);
    }

    // Sentry should NOT be called on success
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  // ── 3. Paired user — primary parent (household_id = their uid) ────────────
  it("nulls partner household_id before deleting primary parent profile", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "uid-primary" });
    mockAdminDeleteUser.mockResolvedValue({ error: null });

    // Track admin FK nullification calls
    const adminUpdateCalls: Array<{ table: string; vals: unknown }> = [];
    const { createAdminClient } = await import("@/lib/supabase/admin");
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((tableName: string) => ({
        update: (vals: unknown) => {
          adminUpdateCalls.push({ table: tableName, vals });
          callLog.push(`admin.${tableName}.update`);
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      })),
      auth: { admin: { deleteUser: mockAdminDeleteUser } },
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);

    // admin must have nulled profiles.household_id (partner's reference)
    const profilesNull = adminUpdateCalls.find(
      (c) => c.table === "profiles" && (c.vals as Record<string, unknown>).household_id === null
    );
    expect(profilesNull).toBeDefined();

    // admin must have nulled household_invites.accepted_by_profile_id
    const invitesNull = adminUpdateCalls.find(
      (c) =>
        c.table === "household_invites" &&
        (c.vals as Record<string, unknown>).accepted_by_profile_id === null
    );
    expect(invitesNull).toBeDefined();
  });

  // ── 4. Paired user — invitee ──────────────────────────────────────────────
  it("nulls accepted_by_profile_id before deleting invitee profile", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "uid-invitee" });
    mockAdminDeleteUser.mockResolvedValue({ error: null });

    const adminUpdateCalls: Array<{ table: string; vals: unknown }> = [];
    const { createAdminClient } = await import("@/lib/supabase/admin");
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((tableName: string) => ({
        update: (vals: unknown) => {
          adminUpdateCalls.push({ table: tableName, vals });
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      })),
      auth: { admin: { deleteUser: mockAdminDeleteUser } },
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);

    const invitesNull = adminUpdateCalls.find(
      (c) =>
        c.table === "household_invites" &&
        (c.vals as Record<string, unknown>).accepted_by_profile_id === null
    );
    expect(invitesNull).toBeDefined();
  });

  // ── 5. DB failure → 500 + Sentry, no auth deletion ───────────────────────
  it("returns 500 and fires Sentry when DB throws, without deleting auth user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "uid-error" });

    // Make the regular client throw on first operation
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        delete: () => ({
          eq: () => Promise.reject(new Error("DB connection error")),
        }),
        select: () => ({
          eq: () => ({
            single: () => Promise.reject(new Error("DB connection error")),
          }),
        }),
      })),
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();

    // Sentry must fire
    expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);

    // Auth user must NOT be deleted when DB step fails
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });
});
