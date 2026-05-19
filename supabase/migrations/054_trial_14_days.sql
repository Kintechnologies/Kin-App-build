-- ─────────────────────────────────────────────────────────────────────────────
-- 054_trial_14_days.sql
--
-- Extends the free trial from 7 to 14 days.
--
-- New signups: handle_new_user() now stamps trial_ends_at 14 days out instead
-- of 7. The function body is otherwise carried over verbatim from migration
-- 038 (phone-first auth) — NULL-email tolerance, phone_number seeding, and the
-- pinned search_path hardening from 037 are all preserved.
--
-- Existing signups: in-flight trials (not yet ended) are extended by the extra
-- 7 days so the change applies to current trial users too, not only new ones.
-- The shift is purely additive — no trial is ever shortened.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone_number, trial_ends_at, referral_code)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    CASE
      WHEN NEW.phone IS NOT NULL AND NEW.phone <> '' THEN '+' || NEW.phone
      ELSE NULL
    END,
    NOW() + INTERVAL '14 days',
    SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.profiles
SET trial_ends_at = trial_ends_at + INTERVAL '7 days'
WHERE subscription_status = 'trial'
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at > NOW();
