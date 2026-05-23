/**
 * Trial expiry flip (audit V4 P0-1 + V5 P0-1).
 *
 * Background: the daily cron flips `trial → canceled` for users whose
 * trial_ends_at is in the past. The Stripe webhook only writes `canceled`
 * on `customer.subscription.deleted` — a user who finishes 14 days without
 * paying has no Stripe subscription, so nothing fires that event. Without
 * this nightly flip, the trial-gating filter `(trial, active)` in the
 * briefing edge function would keep sending free briefings forever.
 *
 * Lifted out of the engagement-nudges route into this shared module
 * (audit V7 P2-B6) so the production query and the regression test share
 * one source of truth — previously the test file inlined its own copy and
 * the two could drift.
 */

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ExpireUnpaidTrialsDeps {
  /**
   * Slack-alert hook fired when the update query errors. Optional so the
   * unit test can pass a noop / spy without dragging in the live notifier.
   */
  notify?: (message: string, level: "info" | "warning" | "critical") => Promise<unknown>;
  /** Optional logger override for the same reason. Defaults to console.error. */
  log?: (message: string) => void;
}

export async function expireUnpaidTrials(
  supabase: AdminClient,
  deps: ExpireUnpaidTrialsDeps = {}
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ subscription_status: "canceled" })
    .eq("subscription_status", "trial")
    .eq("billing_exempt", false)
    .lt("trial_ends_at", new Date().toISOString())
    .select("id");

  if (error) {
    (deps.log ?? ((m) => console.error(m)))(
      `expireUnpaidTrials failed: ${error.message}`
    );
    if (deps.notify) {
      await deps
        .notify(`Trial-expiry flip failed: ${error.message}`, "critical")
        .catch(() => {});
    }
    return 0;
  }
  return data?.length ?? 0;
}
