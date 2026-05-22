-- ─────────────────────────────────────────────────────────────────────────────
-- 076_subscription_current_period_end.sql
--
-- Audit v6 P2-D1: surface the renewal date on the billing page. Migration
-- 065 added cancel_at_period_end so the UI can show "Cancels at end of
-- billing period" without flipping subscription_status prematurely, but it
-- doesn't tell the user WHEN that period ends — they have to log into the
-- Stripe portal to find out. Surface Stripe's subscription.current_period_end
-- on the profile so the billing copy can say "Cancels on May 30" / "Renews
-- on May 30" without an extra round-trip.
--
-- Writer: apps/web/src/app/api/stripe/webhook/route.ts on
-- customer.subscription.updated (the canonical source for subscription state)
-- and customer.subscription.deleted (zeros it out alongside the canceled
-- flip).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
