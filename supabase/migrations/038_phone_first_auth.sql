-- 038_phone_first_auth.sql
-- Phone OTP is now the primary auth method. Phone-only users have no email,
-- so handle_new_user() must tolerate a NULL auth.users.email and seed the
-- profile's phone_number directly from the new auth row.

-- Phone-only signups have no email address.
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Rewrite the signup trigger to handle phone-only users.
-- auth.users.phone is stored as bare digits (no '+'); profiles.phone_number
-- and the inbound Twilio webhook both expect E.164, so prepend '+'.
-- search_path is pinned here to preserve the hardening from migration 037:
-- CREATE OR REPLACE drops function config not restated in this definition.
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
    NOW() + INTERVAL '7 days',
    SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
