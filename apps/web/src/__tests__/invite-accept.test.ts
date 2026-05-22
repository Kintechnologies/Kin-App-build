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
 *
 * The accept route now performs an atomic claim (UPDATE household_invites
 * SET accepted=true WHERE id=$1 AND accepted=false RETURNING id) and only
 * writes profiles.household_id when the claim returns a row. This stub
 * spies on the two distinct UPDATE call shapes the route can issue:
 *
 *   household_invites.update({accepted: true, ...}).eq("id").eq("accepted", false).select("id")
 *   profiles.update({household_id}).eq("id", uid)
 *
 * `invite`           — row returned by household_invites.select().maybeSingle()
 * `partnerHouseholdId` — row returned by profiles.select().single()
 * `claimRow`         — row(s) returned by the atomic-claim UPDATE; defaults to
 *                      a single-row result so the happy path proceeds. Pass
 *                      `[]` to simulate losing the race.
 */
function buildAdminClient(
  invite: Record<string, unknown> | null,
  partnerHouseholdId: string | null = null,
  fetchError: unknown = null,
  claimRow: Array<{ id: string }> = [{ id: "invite-row-001" }]
) {
  // Profiles UPDATE: chainable `.eq()` returning { error: null }
  const profilesUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const profilesUpdate = vi.fn().mockReturnValue({ eq: profilesUpdateEq });

  // Invites UPDATE chain — accepted-true claim:
  //   .update().eq("id").eq("accepted", false).select("id")
  // Also a rollback path that re-issues .update().eq("id") without further chains.
  const invitesClaimSelect = vi
    .fn()
    .mockResolvedValue({ data: claimRow, error: null });
  const invitesClaimEqAccepted = vi
    .fn()
    .mockReturnValue({ select: invitesClaimSelect });
  // Both `accepted` flip (with .select) and rollback flip (terminal) start with
  // .update().eq("id", ...). For rollback the terminal awaits the .eq().
  const invitesUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockImplementation((col: string, _val: unknown) => {
      if (col === "id") {
        return {
          eq: invitesClaimEqAccepted,
          // Terminal awaitable for rollback: thenable resolving to {error: null}
          then: (resolve: (v: { error: null }) => void) =>
            resolve({ error: null }),
        };
      }
      return { error: null };
    }),
  });

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
          update: invitesUpdate,
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
          update: profilesUpdate,
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    },
    _update: profilesUpdate,
    _updateEq: profilesUpdateEq,
    _invitesUpdate: invitesUpdate,
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
  it("returns generic 404 when the authenticated user's email does not match the invite (no enumeration)", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: ACCEPTOR_ID,
      email: "someone-else@example.com",
    });
    const adminClient = buildAdminClient(baseInvite()); // invite is for ACCEPTOR_EMAIL
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Invite not found" });
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
    // If email guard passed, it should proceed (and succeed or hit another guard).
    // Generic 404 is reserved for email mismatch, so passing the guard cannot
    // produce a 404 here.
    expect(res.status).not.toBe(404);
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
