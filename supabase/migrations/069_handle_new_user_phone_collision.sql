-- ─────────────────────────────────────────────────────────────────────────────
-- 069_handle_new_user_phone_collision.sql
--
-- Audit V5 P1-A4: phone-number recycling (FCC ~37M numbers/year) means an auth
-- signup can race with a prior profile that still owns the same phone_number.
-- The pre-V5 handle_new_user() trigger ran a naked INSERT into profiles —
-- when the partial unique index on phone_number tripped, the trigger raised
-- 23505, which propagates back through Supabase's auth signup path and leaves
-- auth.users + profiles in an inconsistent state (auth row created, profile
-- never landed).
--
-- The fix:
--
--   1. INSERT with ON CONFLICT (id) DO NOTHING so a re-run / replay of the
--      trigger never raises on the primary key.
--
--   2. Claim the phone in a separate statement, NULL'ing it when the unique
--      index would conflict. The conflicting row is necessarily owned by a
--      different profile (id collision is handled above) — that profile keeps
--      the phone; the new user gets a profile with no phone set, can text in
--      to claim it from the SMS bot once the prior owner is removed, or can
--      contact support.
--
-- The structural invariant V3/V4 relied on still holds: every auth.users row
-- gets a profiles row. The only weakening is that the phone column on the new
-- profile may be NULL where it used to be either-set-or-trigger-raised. The
-- briefing crons all filter on phone_number IS NOT NULL, so a profile with a
-- NULL phone is a no-op for the SMS pipeline until claim resolves.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  candidate_phone text := CASE
    WHEN NEW.phone IS NOT NULL AND NEW.phone <> '' THEN '+' || NEW.phone
    ELSE NULL
  END;
  phone_collision boolean := false;
BEGIN
  IF candidate_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE phone_number = candidate_phone
        AND id <> NEW.id
    ) INTO phone_collision;
  END IF;

  INSERT INTO public.profiles (id, email, phone_number, trial_ends_at, referral_code)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    CASE WHEN phone_collision THEN NULL ELSE candidate_phone END,
    NOW() + INTERVAL '14 days',
    SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
