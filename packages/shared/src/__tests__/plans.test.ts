import { describe, it, expect } from "vitest";
import { PLANS } from "../constants/plans";

// Replacement for the briefing-prompt-drift test deleted in V4 P0-6 (the
// duplicated apps/web/src/lib/sms-briefing.ts that drift-test guarded is gone
// — drift is now structurally impossible). This file locks in the
// monthly-only pricing invariant V4 P0-3 introduced.

describe("PLANS constant — monthly-only pricing invariant", () => {
  it("exposes the $39 monthly price for Kin Premium", () => {
    expect(PLANS.premium.monthlyPrice).toBe(39);
  });

  it("carries the canonical product name", () => {
    expect(PLANS.premium.name).toBe("Kin Premium");
  });
});
