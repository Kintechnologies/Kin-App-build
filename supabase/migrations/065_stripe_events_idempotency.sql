-- ─────────────────────────────────────────────────────────────────────────────
-- 065_stripe_events_idempotency.sql
--
-- Audit v5 P0-3 + P0-4: harden the Stripe webhook handler.
--
-- (1) stripe_events table — event-id-keyed dedup so a retried webhook is a
--     no-op. Stripe documents that webhooks can be delivered more than once
--     and that retries continue for up to 3 days. Without dedup, a retried
--     `invoice.payment_failed` arriving after the user re-pays would flip a
--     paying customer back to `past_due`; a retried `checkout.session.completed`
--     would re-run the activation path. The webhook handler inserts the
--     event_id immediately after signature validation and short-circuits on
--     ON CONFLICT.
--
-- (2) profiles.cancel_at_period_end — the Stripe Customer Portal sets this
--     flag when a user cancels (the actual `customer.subscription.deleted` can
--     be up to 30 days later). The webhook now handles
--     `customer.subscription.updated` and writes this column so the UI can
--     show "Cancels on …" without flipping subscription_status prematurely.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role only" ON stripe_events FOR ALL USING (false);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
