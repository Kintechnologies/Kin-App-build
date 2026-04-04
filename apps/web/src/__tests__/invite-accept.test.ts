/**
 * Invite acceptance flow tests
 *
 * Covers the five guard conditions that protect the household link operation:
 *   1. Already accepted invite
 *   2. Expired invite
 *   3. Self-accept (inviter === acceptor)
 *   4. Wrong email (invite was not sent to this user's email)
 *   5. Acceptor already in a household
 *
 * Plus the happy path.
 *
 * Strategy: mock getAuthenticatedUser and @/lib/supabase/admin.createAdminClient.
 * Build per-test admin client stubs that return controlled invite/profile data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock handles ──────────────────────────────────────────────────────
const { mockGetAuthenticatedUser, mockCreateAdminClient } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

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

// The route does a dynamic import: `await import("@/lib/supabase/admin")`
// vi.mock intercepts both static and dynamic imports.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role_key_xxx");

// Import route after mocks
import { POST } from "../app/api/invite/[code]/accept/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const INVITER_ID = "inviter-profile-001";
const ACCEPTOR_ID = "acceptor-profile-002";
const ACCEPTOR_EMAIL = "partner@example.com";
const INVITE_CODE = "abc123def456";
const INVITE_ID = "invite-row-001";

function makeRequest(code: string = INVITE_CODE): Request {
  return new Request(`https://example.com/api/invite/${code}/accept`, {
    method: "POST",
  });
}

function makeParams(code: string = INVITE_CODE) {
  return { params: { code } };
}

/** Future expiry (valid invite) */
const FUTURE_EXPIRY = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
/** Past expiry (expired invite) */
const PAST_EXPIRY = new Date(Date.now() - 1).toISOString();

function baseInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: INVITE_ID,
    inviter_profile_id: INVITER_ID,
    invitee_email: ACCEPTOR_EMAIL,
    accepted: false,
    expires_at: FUTURE_EXPIRY,
    ...overrides,
  };
}

/**
 * Build a minimal Supabase admin client stub.
 * `invite`: what maybeSingle() returns for household_invites
 * `partnerHouseholdId`: what the profiles.select().single() returns
 */
function buildAdminClient(
  invite: Record<string, unknown> | null,
  partnerHouseholdId: string | null = null,
  fetchError: unknown = null
) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  return {
    from: (table: string) => {
      if (table === "household_invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: invite, error: fetchError }),
            }),
          }),
          update,
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { household_id: partnerHouseholdId },
                error: null,
              }),
            }),
          }),
          update,
        };
      }
      return { select: vi.fn(), update };
    },
    _update: update,
    _updateEq: updateEq,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/invite/[code]/accept — guard conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated acceptor with the right email
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: ACCEPTOR_EMAIL,
    });
  });

  // ── Guard 1: already accepted ─────────────────────────────────────────────
  it("returns 409 when the invite has already been accepted", async () => {
    const adminClient = buildAdminClient(baseInvite({ accepted: true }));
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "Invite already used" });
  });

  // ── Guard 2: expired ──────────────────────────────────────────────────────
  it("returns 410 when the invite has expired", async () => {
    const adminClient = buildAdminClient(baseInvite({ expires_at: PAST_EXPIRY }));
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ error: "Invite has expired" });
  });

  // ── Guard 3: self-accept ──────────────────────────────────────────────────
  it("returns 400 when the inviter tries to accept their own invite", async () => {
    // Make the authenticated user the *inviter*
    mockGetAuthenticatedUser.mockResolvedValue({
      id: INVITER_ID,
      email: "inviter@example.com",
    });
    const adminClient = buildAdminClient(
      baseInvite({ invitee_email: "inviter@example.com", inviter_profile_id: INVITER_ID })
    );
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "You cannot accept your own invite" });
  });

  // ── Guard 4: wrong email ──────────────────────────────────────────────────
  it("returns 403 when the authenticated user's email does not match the invite", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: "someone-else@example.com",
    });
    const adminClient = buildAdminClient(baseInvite()); // invite is for ACCEPTOR_EMAIL
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: "This invite was not sent to your email address",
    });
  });

  it("email comparison is case-insensitive", async () => {
    // User email is uppercase, invite email is lowercase — should still match
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: "PARTNER@EXAMPLE.COM",
    });
    const adminClient = buildAdminClient(baseInvite({ invitee_email: "partner@example.com" }));
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    // If email guard passed, it should proceed (and succeed or hit another guard)
    expect(res.status).not.toBe(403);
  });

  // ── Guard 5: already in a household ──────────────────────────────────────
  it("returns 409 when the acceptor is already in a household", async () => {
    const adminClient = buildAdminClient(baseInvite(), "existing-household-id");
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining("already part of a household"),
    });
  });
});

describe("POST /api/invite/[code]/accept — auth checks", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 when invite code is missing from params", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: ACCEPTOR_EMAIL,
    });

    const res = await POST(makeRequest(""), makeParams(""));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/invite/[code]/accept — happy path", () => {
  it("returns 200 { success: true } and links the household", async () => {
    const adminClient = buildAdminClient(baseInvite(), null); // not in a household yet
    mockCreateAdminClient.mockReturnValue(adminClient);
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: ACCEPTOR_EMAIL,
    });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("updates the partner profile with the inviter's household_id", async () => {
    const adminClient = buildAdminClient(baseInvite(), null);
    mockCreateAdminClient.mockReturnValue(adminClient);
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: ACCEPTOR_EMAIL,
    });

    await POST(makeRequest(), makeParams());

    // The profiles update should set household_id to the inviter's profile id
    expect(adminClient._update).toHaveBeenCalledWith({
      household_id: INVITER_ID,
    });
    expect(adminClient._updateEq).toHaveBeenCalledWith("id", ACCEPTOR_ID);
  });
});

describe("POST /api/invite/[code]/accept — invite not found", () => {
  it("returns 404 when invite code does not exist", async () => {
    const adminClient = buildAdminClient(null); // maybeSingle returns null
    mockCreateAdminClient.mockReturnValue(adminClient);
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: ACCEPTOR_EMAIL,
    });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });
});
