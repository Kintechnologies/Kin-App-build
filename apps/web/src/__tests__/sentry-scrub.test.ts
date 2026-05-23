/**
 * sentry-scrub PII redaction tests (V5 P1-I5).
 *
 * The beforeSend hook runs on every Sentry event from every runtime. These
 * tests pin the contract: anything resembling phone / email / UUID gets
 * redacted; sensitive keys are nuked outright; debugging fields the team
 * relies on (Stripe IDs, generic stack frames) survive.
 */

import { describe, it, expect } from "vitest";
import { scrubSentryEvent } from "@/lib/sentry-scrub";
import type { ErrorEvent } from "@sentry/nextjs";

function makeEvent(over: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    event_id: "x",
    timestamp: 1,
    ...over,
  } as ErrorEvent;
}

describe("scrubSentryEvent", () => {
  it("redacts phone numbers in extra strings", () => {
    const event = makeEvent({
      extra: { note: "user phone is +16266762222" },
    });
    const scrubbed = scrubSentryEvent(event);
    expect(JSON.stringify(scrubbed!.extra)).toContain("<phone>");
    expect(JSON.stringify(scrubbed!.extra)).not.toContain("16266762222");
  });

  it("redacts emails", () => {
    const event = makeEvent({
      extra: { recipient: "sarah@example.com" },
    });
    const scrubbed = scrubSentryEvent(event);
    expect(JSON.stringify(scrubbed!.extra)).toContain("<email>");
    expect(JSON.stringify(scrubbed!.extra)).not.toContain("sarah@example.com");
  });

  it("redacts UUIDs (household_id, profile_id) in message strings", () => {
    const event = makeEvent({
      message: "failed for profile 0da19b72-fe0f-44cf-a55c-b4bf219f2f44",
    });
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed!.message).toContain("<uuid>");
    expect(scrubbed!.message).not.toContain("0da19b72");
  });

  it("nukes sensitive keys outright (phone_number, household_id, email)", () => {
    const event = makeEvent({
      extra: {
        phone_number: "+16266762222",
        household_id: "abc",
        email: "a@b.com",
        // Non-sensitive key — preserved (after string-level redaction)
        stripe_customer_id: "cus_ABC123",
      },
    });
    const scrubbed = scrubSentryEvent(event);
    expect((scrubbed!.extra as Record<string, unknown>).phone_number).toBe(
      "<redacted>"
    );
    expect((scrubbed!.extra as Record<string, unknown>).household_id).toBe(
      "<redacted>"
    );
    expect((scrubbed!.extra as Record<string, unknown>).email).toBe(
      "<redacted>"
    );
    // Stripe identifiers stay — they are not PII on their own
    expect(
      (scrubbed!.extra as Record<string, unknown>).stripe_customer_id
    ).toBe("cus_ABC123");
  });

  it("reduces event.user to an opaque id only", () => {
    const event = makeEvent({
      user: {
        id: "uid-123",
        email: "sarah@example.com",
        username: "sarah",
        ip_address: "1.2.3.4",
      },
    });
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed!.user).toEqual({ id: "uid-123" });
  });

  it("nukes V7 P1-P2 Kin-specific PII keys", () => {
    const event = makeEvent({
      extra: {
        family_name: "Sarah Ford",
        last_name: "Ford",
        partner_name: "Jontae",
        kid_names: ["Mira", "Theo"],
        assigned_member: "Mira",
        body: "kid name and pickup time",
        context_notes: "shared note with location",
        invitee_phone: "+15551234567",
      },
    });
    const scrubbed = scrubSentryEvent(event)!;
    const extra = scrubbed.extra as Record<string, unknown>;
    expect(extra.family_name).toBe("<redacted>");
    expect(extra.last_name).toBe("<redacted>");
    expect(extra.partner_name).toBe("<redacted>");
    expect(extra.kid_names).toBe("<redacted>");
    expect(extra.assigned_member).toBe("<redacted>");
    expect(extra.body).toBe("<redacted>");
    expect(extra.context_notes).toBe("<redacted>");
    expect(extra.invitee_phone).toBe("<redacted>");
  });

  it("redacts exception value strings", () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: "Error",
            value: "failed to send to +12345678901: rejected",
          },
        ],
      },
    });
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed!.exception!.values![0].value).toContain("<phone>");
  });
});
