/**
 * Stripe webhook replay short-circuit test — guards V5 P0-3.
 *
 * Background: Stripe retries every webhook event for up to 3 days on any
 * non-2xx (or no response). Migration 065 added `stripe_events(event_id PK)`
 * and the webhook route inserts each `event.id` before running the handler;
 * a duplicate insert hits the unique constraint with Postgres code 23505 and
 * the handler short-circuits to `200 { received, deduped: true }`. This test
 * proves the second delivery of the same event_id never re-fires the side
 * effect (P2-B3 from audit v6).
 *
 * Like expire-unpaid-trials.test.ts, we inline the dedup function to avoid
 * pulling the full Next route file into a unit test.
 */

import { describe, it, expect, beforeEach } from "vitest";

interface FakeStripeEvent {
  id: string;
  type: string;
}

/**
 * Stripe-events replay-aware dedup helper. Mirrors the shape of the
 * webhook route at lines 181-201: insert event_id, treat 23505 as already
 * processed, return whether the handler should run.
 */
async function tryRecordEvent(
  supabase: {
    from: (t: string) => {
      insert: (row: { event_id: string; event_type: string }) => {
        select: (cols: string) => {
          maybeSingle: () => Promise<{
            data: { event_id: string } | null;
            error: { code: string; message: string } | null;
          }>;
        };
      };
    };
  },
  event: FakeStripeEvent
): Promise<"fresh" | "deduped" | "error"> {
  const { data: inserted, error } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, event_type: event.type })
    .select("event_id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return "deduped";
    return "error";
  }
  if (!inserted) return "deduped";
  return "fresh";
}

/**
 * Stand-in for the supabase client that remembers every insert and returns
 * a 23505 unique_violation on a duplicate event_id — same behavior as the
 * `stripe_events.event_id` primary key in migration 065.
 */
function buildReplayAwareClient() {
  const seen = new Set<string>();
  const sideEffectLog: string[] = [];

  const client = {
    from(table: string) {
      return {
        insert(row: { event_id: string; event_type: string }) {
          return {
            select() {
              return {
                async maybeSingle() {
                  if (table !== "stripe_events") {
                    return { data: { event_id: row.event_id }, error: null };
                  }
                  if (seen.has(row.event_id)) {
                    return {
                      data: null,
                      error: { code: "23505", message: "duplicate key" },
                    };
                  }
                  seen.add(row.event_id);
                  return { data: { event_id: row.event_id }, error: null };
                },
              };
            },
          };
        },
      };
    },
    // The "side effect" — only callable after a successful dedup insert. In
    // production this is setStatus / sendPaymentConfirmation; here it's a
    // recorder so the test can assert the count.
    runHandler(eventId: string) {
      sideEffectLog.push(eventId);
    },
    _seen: seen,
    _sideEffectLog: sideEffectLog,
  };

  return client;
}

describe("stripe webhook replay (V5 P0-3 / V6 P2-B3)", () => {
  let supabase: ReturnType<typeof buildReplayAwareClient>;
  const event: FakeStripeEvent = {
    id: "evt_1234567890",
    type: "checkout.session.completed",
  };

  beforeEach(() => {
    supabase = buildReplayAwareClient();
  });

  it("records a fresh event and runs the handler exactly once", async () => {
    const result = await tryRecordEvent(supabase, event);
    if (result === "fresh") supabase.runHandler(event.id);

    expect(result).toBe("fresh");
    expect(supabase._sideEffectLog).toEqual([event.id]);
    expect(supabase._seen.has(event.id)).toBe(true);
  });

  it("short-circuits the second delivery of the same event_id (23505)", async () => {
    // First delivery — runs the side effect.
    const first = await tryRecordEvent(supabase, event);
    if (first === "fresh") supabase.runHandler(event.id);
    // Stripe retries the same event.id (typical: 1m, 5m, 1h, ...).
    const second = await tryRecordEvent(supabase, event);
    if (second === "fresh") supabase.runHandler(event.id);

    expect(first).toBe("fresh");
    expect(second).toBe("deduped");
    // The crux: the side effect fires exactly once even on a duplicate
    // delivery — otherwise a portal cancel could re-bill, a payment-
    // succeeded retry could double-send the confirmation email, etc.
    expect(supabase._sideEffectLog).toEqual([event.id]);
  });

  it("treats two distinct event_ids as independent — never collapses them", async () => {
    const a: FakeStripeEvent = { id: "evt_aaa", type: "invoice.payment_succeeded" };
    const b: FakeStripeEvent = { id: "evt_bbb", type: "invoice.payment_succeeded" };

    const ra = await tryRecordEvent(supabase, a);
    if (ra === "fresh") supabase.runHandler(a.id);
    const rb = await tryRecordEvent(supabase, b);
    if (rb === "fresh") supabase.runHandler(b.id);

    expect(ra).toBe("fresh");
    expect(rb).toBe("fresh");
    expect(supabase._sideEffectLog).toEqual([a.id, b.id]);
  });

  it("survives many replay attempts of the same event_id (Stripe retries up to 3d)", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await tryRecordEvent(supabase, event);
      if (r === "fresh") supabase.runHandler(event.id);
    }
    expect(supabase._sideEffectLog).toEqual([event.id]);
  });

  it("surfaces non-23505 insert errors as 'error' so the route can 500 and let Stripe retry", async () => {
    const brokenClient = {
      from() {
        return {
          insert() {
            return {
              select() {
                return {
                  async maybeSingle() {
                    return {
                      data: null,
                      error: { code: "08000", message: "connection failure" },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
    const r = await tryRecordEvent(
      brokenClient as unknown as Parameters<typeof tryRecordEvent>[0],
      event
    );
    expect(r).toBe("error");
  });
});
