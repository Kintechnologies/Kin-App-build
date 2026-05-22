-- ─────────────────────────────────────────────────────────────────────────────
-- 070_delete_user_account_function.sql
--
-- Audit V5 P1-A5: account-delete used to issue 10 sequential awaits from the
-- Next.js route. A mid-route Vercel timeout (10s Hobby tier) could leave
-- orphaned partial state — chat/calendar/conversation rows deleted but profile
-- and auth.users intact, or worse, profile deleted while household partner FK
-- was silently nullified. GDPR/CCPA promise exposure on a partial delete.
--
-- This migration ships a single SECURITY DEFINER Postgres function that
-- performs the entire deletion inside one implicit transaction. Either every
-- row goes, or none do. The Next.js route now invokes this RPC, then issues
-- the final auth.admin.deleteUser call separately (Supabase auth uses a
-- different connection and can't participate in the same DB transaction; we
-- only delete auth AFTER the DB tx succeeds so a rolled-back DB tx can never
-- leave an auth.users orphan).
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

  -- Null FKs that point at this profile so the row delete doesn't fail.
  UPDATE public.profiles SET household_id = NULL WHERE household_id = uid;
  UPDATE public.household_invites
    SET accepted_by_profile_id = NULL
  WHERE accepted_by_profile_id = uid;

  DELETE FROM public.profiles WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO postgres, service_role;
