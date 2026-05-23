-- ─────────────────────────────────────────────────────────────────────────────
-- 079_delete_user_account_sms_conversations.sql
--
-- Audit V7 P1-P1: sms_conversations orphaned (not deleted) on account
-- deletion — GDPR right-to-erasure violation. Migration 030 set the
-- profile_id FK to ON DELETE SET NULL so a delete didn't fail when SMS rows
-- existed, but migration 070's delete_user_account() never explicitly
-- removed those rows. Result: every kid name, school name, partner phone,
-- and conversation body the user ever texted remained in the DB
-- indefinitely (privacy policy promises 30-day full erasure).
--
-- This migration replaces the function in place to also DELETE FROM
-- sms_conversations WHERE profile_id = uid before the profile row is
-- removed — same SECURITY DEFINER, same single-transaction guarantee as
-- the rest of the deletion.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_account(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_household uuid;
  remaining_member_count integer;
BEGIN
  SELECT household_id INTO user_household
  FROM public.profiles
  WHERE id = uid;

  DELETE FROM public.chat_messages WHERE profile_id = uid;
  DELETE FROM public.chat_threads WHERE profile_id = uid;
  DELETE FROM public.calendar_events WHERE owner_parent_id = uid;
  DELETE FROM public.sms_conversations WHERE profile_id = uid;

  IF user_household IS NOT NULL THEN
    SELECT COUNT(*) INTO remaining_member_count
    FROM public.profiles
    WHERE household_id = user_household AND id <> uid;

    IF remaining_member_count = 0 THEN
      DELETE FROM public.coordination_issues WHERE household_id = user_household;
    END IF;
  END IF;

  DELETE FROM public.morning_briefings WHERE profile_id = uid;
  DELETE FROM public.kin_check_ins WHERE profile_id = uid;
  DELETE FROM public.push_tokens WHERE profile_id = uid;

  UPDATE public.profiles SET household_id = NULL WHERE household_id = uid;
  UPDATE public.household_invites
    SET accepted_by_profile_id = NULL
  WHERE accepted_by_profile_id = uid;

  DELETE FROM public.profiles WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO postgres, service_role;
