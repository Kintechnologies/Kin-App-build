-- Security hardening: pin search_path on SECURITY DEFINER functions, revoke
-- public/anon execute on internal functions, and remove anon SELECT from
-- tables that should not be reachable via the GraphQL/PostgREST endpoint.
--
-- The only table anon may SELECT from is `waitlist` (public signup form).
-- Authenticated users keep SELECT everywhere; RLS handles row filtering.
--
-- Every statement is guarded with to_regclass/to_regprocedure: this migration
-- runs after the 035/036 stale-table drops, and several hardening targets were
-- never created in this project's schema. Missing objects are skipped so the
-- migration applies cleanly instead of aborting on the first absent relation.

-- 1. Pin search_path on functions flagged for mutable search_path.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.update_coordination_issues_updated_at()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    END IF;
  END LOOP;
END $$;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from client roles.
--    handle_new_user is invoked by the auth trigger as the table owner;
--    rls_auto_enable should only run during migrations.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.rls_auto_enable()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- 3. Revoke anon SELECT on tables that should not be queryable via GraphQL.
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'profiles',
    'family_members',
    'calendar_events',
    'coordination_issues',
    'sms_conversations',
    'sms_messages',
    'morning_briefing_log',
    'households',
    'household_members',
    'user_preferences',
    'onboarding_progress',
    'family_member_preferences',
    'pickup_logistics',
    'smart_scheduling_rules',
    'notification_preferences',
    'waitlist_analytics'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;
