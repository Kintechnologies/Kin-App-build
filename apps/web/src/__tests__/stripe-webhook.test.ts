/**
 * Stripe webhook handler tests
 *
 * Covers: checkout.session.completed, customer.subscription.deleted,
 *         invoice.payment_failed, and idempotency (duplicate events).
 *
 * Strategy: mock Stripe constructor + Supabase createClient at module level;
 * inject synthetic events via constructEvent mock; assert DB side-effects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (must run before vi.mock factory closures) ─────────────────
const {
  mockConstructEvent,
  mockRetrieveSubscription,
  mockUpdate,
  mockEq,
  mockSingle,
  mockSelect,
  mockFrom,
  mockHeaders,
} = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockSelect = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate, select: mockSelect });

  return {
    mockConstructEvent: vi.fn(),
    mockRetrieveSubscription: vi.fn(),
    mockUpdate,
    mockEq,
    mockSingle,
    mockSelect,
    mockFrom,
    mockHeaders: vi.fn(() => ({ get: vi.fn(() => "test-stripe-sig") })),
  };
});

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({ headers: mockHeaders }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: (init as { status?: number } | undefined)?.status ?? 200,
      json: async () => data,
    })),
  },
}));

vi.mock("stripe", () => ({
  // Must use `function` (not arrow) so `new Stripe()` works as a constructor
  default: vi.fn(function MockStripe() {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockRetrieveSubscription },
    };
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Set required env vars before importing the route ────────────────────────
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxx");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_xxx");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role_key_xxx");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

// Import after mocks are registered
import { POST } from "../app/api/webhooks/stripe/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: string = "{}") {
  return new Request("https://example.com/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "stripe-signature": "test-stripe-sig" },
  });
}

function makeCheckoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "checkout.session.completed",
    id: "evt_checkout_001",
    data: {
      object: {
        metadata: { supabase_user_id: "user-abc", plan: "family" },
        customer: "cus_test_123",
        subscription: null,
        ...overrides,
      },
    },
  };
}

function makeSubscriptionDeletedEvent(userId = "user-abc") {
  return {
    type: "customer.subscription.deleted",
    id: "evt_sub_del_001",
    data: {
      object: {
        metadata: { supabase_user_id: userId },
        id: "sub_test_001",
      },
    },
  };
}

function makePaymentFailedEvent(customerId = "cus_test_123") {
  return {
    type: "invoice.payment_failed",
    id: "evt_pay_fail_001",
    data: {
      object: {
        customer: customerId,
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Stripe webhook — checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: mockSingle }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it("returns 200 { received: true } on a valid event", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutEvent());
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("updates profile with starter tier and stripe_customer_id", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutEvent());
    await POST(makeRequest());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_tier: "starter",
        stripe_customer_id: "cus_test_123",
        cancelled_at: null,
        data_deletion_at: null,
        deletion_reminded: false,
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "user-abc");
  });

  it("updates profile with starter tier when plan is not 'family'", async () => {
    mockConstructEvent.mockReturnValue(
      makeCheckoutEvent({ metadata: { supabase_user_id: "user-abc", plan: "starter" } })
    );
    await POST(makeRequest());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: "starter" })
    );
  });

  it("skips profile update when userId metadata is missing", async () => {
    mockConstructEvent.mockReturnValue(
      makeCheckoutEvent({ metadata: {} })
    );
    await POST(makeRequest());
    // No DB writes should happen
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("clears cancellation fields on reactivation", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutEvent());
    await POST(makeRequest());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelled_at: null,
        data_deletion_at: null,
        deletion_reminded: false,
      })
    );
  });
});

describe("Stripe webhook — customer.subscription.deleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it("returns 200 { received: true }", async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionDeletedEvent());
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("downgrades subscription_tier to 'free'", async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionDeletedEvent("user-xyz"));
    await POST(makeRequest());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: "free" })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "user-xyz");
  });

  it("sets cancelled_at to the current time (within 5 seconds)", async () => {
    const before = Date.now();
    mockConstructEvent.mockReturnValue(makeSubscriptionDeletedEvent());
    await POST(makeRequest());
    const after = Date.now();

    const call = mockUpdate.mock.calls[0][0] as { cancelled_at: string };
    const cancelledAt = new Date(call.cancelled_at).getTime();
    expect(cancelledAt).toBeGreaterThanOrEqual(before);
    expect(cancelledAt).toBeLessThanOrEqual(after);
  });

  it("schedules data_deletion_at 90 days from now", async () => {
    const before = Date.now();
    mockConstructEvent.mockReturnValue(makeSubscriptionDeletedEvent());
    await POST(makeRequest());

    const call = mockUpdate.mock.calls[0][0] as { data_deletion_at: string };
    const deletionAt = new Date(call.data_deletion_at).getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    expect(deletionAt).toBeGreaterThanOrEqual(before + ninetyDaysMs);
    expect(deletionAt).toBeLessThanOrEqual(Date.now() + ninetyDaysMs + 5000);
  });

  it("skips DB update when userId metadata is missing", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      id: "evt_001",
      data: { object: { metadata: {}, id: "sub_001" } },
    });
    await POST(makeRequest());
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — invoice.payment_failed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it("returns 200 { received: true } (payment failure is logged, not fatal)", async () => {
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent());
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("does not write to the database (no profile changes on payment failure)", async () => {
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent());
    await POST(makeRequest());
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it("processes the same checkout event twice without error (Stripe retry safety)", async () => {
    const event = makeCheckoutEvent();
    mockConstructEvent.mockReturnValue(event);

    const res1 = await POST(makeRequest());
    const res2 = await POST(makeRequest());

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(await res1.json()).toEqual({ received: true });
    expect(await res2.json()).toEqual({ received: true });
  });

  it("processes the same subscription.deleted event twice without error", async () => {
    const event = makeSubscriptionDeletedEvent();
    mockConstructEvent.mockReturnValue(event);

    const res1 = await POST(makeRequest());
    const res2 = await POST(makeRequest());

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});

describe("Stripe webhook — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it("returns 503 when STRIPE_SECRET_KEY env var is not set", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxx"); // restore
  });

  it("returns 400 when stripe signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when stripe-signature header is absent", async () => {
    mockHeaders.mockImplementationOnce(() => ({ get: vi.fn(() => null as unknown as string) }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });
});
