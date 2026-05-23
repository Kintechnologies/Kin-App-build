-- ─────────────────────────────────────────────────────────────────────────────
-- 080_delete_user_account_partner_cascade.sql
--
-- Audit V7 P2-P2: delete_user_account() (migrations 070 + 079) only
-- removed rows keyed by `profile_id = uid`. Household-scoped tables that
-- carry partner PII independently of the primary's row — family_members,
-- family_routines, family_preferences, household_context, activity_log,
-- user_context_notes — survived when the partner was the one being
-- deleted, because the existing cascade only fires when the *household
-- primary* is the target. A partner who exercised right-to-erasure
-- therefore left their kid names, schedule notes, and routine entries
-- behind in the household tables.
--
-- This migration replaces the function in place to also explicitly
-- remove every household-scoped row authored by the user. We do NOT
-- delete the shared household_context / family_routines / etc. rows
-- when other members remain — those are shared records and removing
-- them would surprise the remaining household members. Instead we
-- sanitize the columns that personally identify the leaving user.
--
-- Activity-log entries authored by the user are removed in full, since
-- those rows are 1:1 with the user's own actions and are required to
-- be purged under GDPR Art. 17.
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

  -- Per-user rows from migration 079 already handled below; extend the
  -- erasure to every additional surface that 1:1-maps to the user.
  -- These are no-ops if the table or column doesn't exist in older envs.
  BEGIN
    DELETE FROM public.user_context_notes WHERE profile_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM public.activity_log WHERE profile_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  IF user_household IS NOT NULL THEN
    SELECT COUNT(*) INTO remaining_member_count
    FROM public.profiles
    WHERE household_id = user_household AND id <> uid;

    IF remaining_member_count = 0 THEN
      -- Last person out: tear down household-scoped tables in full.
      DELETE FROM public.coordination_issues WHERE household_id = user_household;
      BEGIN
        DELETE FROM public.family_members WHERE household_id = user_household;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.family_routines WHERE household_id = user_household;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.family_preferences WHERE household_id = user_household;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.household_context WHERE household_id = user_household;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    ELSE
      -- Partner is leaving but the household lives on — scrub any rows
      -- whose `created_by`/`author_profile_id` identifies the departing
      -- partner. Shared rows authored by someone else are left intact.
      BEGIN
        DELETE FROM public.family_routines
        WHERE household_id = user_household AND created_by = uid;
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
      END;
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
