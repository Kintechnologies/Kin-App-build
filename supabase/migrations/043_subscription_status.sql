-- Subscription lifecycle status for the Stripe billing flow.
-- trial: 7-day app-level trial (default at signup)
-- active: paying subscriber
-- past_due: a recurring payment failed; Stripe is retrying
-- canceled: subscription ended

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'trial';

-- Webhook handlers look profiles up by Stripe customer id (payment_failed has
-- no user metadata), so index it.
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles (stripe_customer_id);
