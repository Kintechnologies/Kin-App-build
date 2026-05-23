/**
 * expireUnpaidTrials query-shape test — guards V4 P0-1 and V5 P0-1.
 *
 * Background: the V4 P0-1 fix added a daily flip from `trial → canceled` for
 * users whose trial ended without paying. V4 shipped that query with a
 * `stripe_customer_id IS NULL OR stripe_customer_id = ''` predicate that
 * excluded users who'd started Stripe Checkout but bailed before paying —
 * those users had a non-null stripe_customer_id stamped at session creation
 * AND `subscription_status = 'trial'`, so the flip never reached them and
 * they kept getting free briefings forever (V5 P0-1). The V5 fix dropped the
 * predicate. This test pins the query shape so the predicate can't drift
 * back in on a future refactor.
 *
 * Imports the production function from @/lib/billing/expire-trials (audit
 * V7 P2-B6) so this test and the cron route share one source of truth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { expireUnpaidTrials } from "@/lib/billing/expire-trials";

interface QueryRecorder {
  filters: Array<{ method: string; args: unknown[] }>;
}

function buildSpyClient(recorder: QueryRecorder, expiredIds: string[] = []) {
  const select = vi.fn().mockResolvedValue({
    data: expiredIds.map((id) => ({ id })),
    error: null,
  });
  const chain = {
    update: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
      recorder.filters.push({ method: "update", args: [vals] });
      return chain;
    }),
    eq: vi.fn().mockImplementation((col: string, val: unknown) => {
      recorder.filters.push({ method: "eq", args: [col, val] });
      return chain;
    }),
    lt: vi.fn().mockImplementation((col: string, val: unknown) => {
      recorder.filters.push({ method: "lt", args: [col, val] });
      return chain;
    }),
    or: vi.fn().mockImplementation((filter: string) => {
      recorder.filters.push({ method: "or", args: [filter] });
      return chain;
    }),
    select,
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _select: select,
  };
}

// The production function expects an AdminClient. Our spy shape matches the
// methods exercised — cast through unknown so the test stays narrow.
type AnyClient = Parameters<typeof expireUnpaidTrials>[0];
const runWithSpy = (s: ReturnType<typeof buildSpyClient>) =>
  expireUnpaidTrials(s as unknown as AnyClient);

describe("expireUnpaidTrials (V4 P0-1 + V5 P0-1)", () => {
  let recorder: QueryRecorder;

  beforeEach(() => {
    recorder = { filters: [] };
  });

  it("issues the update against the profiles table", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });

  it("flips status to canceled (the value the briefing fan-out filter excludes)", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    const update = recorder.filters.find((f) => f.method === "update");
    expect(update?.args[0]).toEqual({ subscription_status: "canceled" });
  });

  it("filters to trial users only — never touches active/past_due/canceled", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    const statusEq = recorder.filters.find(
      (f) => f.method === "eq" && f.args[0] === "subscription_status"
    );
    expect(statusEq?.args[1]).toBe("trial");
  });

  it("respects billing_exempt = false — exempt users (Austin, Jontae) are never auto-canceled", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    const exemptEq = recorder.filters.find(
      (f) => f.method === "eq" && f.args[0] === "billing_exempt"
    );
    expect(exemptEq?.args[1]).toBe(false);
  });

  it("filters trial_ends_at < now — never expires an in-flight trial early", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    const lt = recorder.filters.find((f) => f.method === "lt");
    expect(lt?.args[0]).toBe("trial_ends_at");
    expect(typeof lt?.args[1]).toBe("string");
    expect(new Date(lt!.args[1] as string).getTime()).toBeLessThanOrEqual(
      Date.now() + 1000
    );
  });

  it("does NOT add a stripe_customer_id predicate — V5 P0-1 regression guard", async () => {
    const supabase = buildSpyClient(recorder);
    await runWithSpy(supabase);
    // Either an .or() with stripe_customer_id, or a direct .eq/.is on the
    // column — both forms would re-introduce the V5 P0-1 bug.
    const hasStripeFilter = recorder.filters.some((f) => {
      const s = JSON.stringify(f.args);
      return s.includes("stripe_customer_id");
    });
    expect(hasStripeFilter).toBe(false);
  });

  it("returns the number of flipped profiles", async () => {
    const supabase = buildSpyClient(recorder, ["a", "b", "c"]);
    const n = await runWithSpy(supabase);
    expect(n).toBe(3);
  });
});
