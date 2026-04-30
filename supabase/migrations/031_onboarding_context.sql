-- 031_onboarding_context.sql
-- context_notes: accumulated SMS onboarding answers injected into Claude context
-- partner_phone_pending: partner's phone stored during web onboarding, cleared after invite SMS is sent

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS context_notes TEXT,
  ADD COLUMN IF NOT EXISTS partner_phone_pending TEXT;
