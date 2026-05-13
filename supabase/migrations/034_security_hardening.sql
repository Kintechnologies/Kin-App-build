-- Security hardening: pin search_path on SECURITY DEFINER functions, revoke
-- public/anon execute on internal functions, and remove anon SELECT from
-- tables that should not be reachable via the GraphQL/PostgREST endpoint.
--
-- The only table anon may SELECT from is `waitlist` (public signup form).
-- Authenticated users keep SELECT everywhere; RLS handles row filtering.

-- 1. Pin search_path on functions flagged for mutable search_path.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_coordination_issues_updated_at() SET search_path = public;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from client roles.
--    handle_new_user is invoked by the auth trigger as the table owner;
--    rls_auto_enable should only run during migrations.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- 3. Revoke anon SELECT on tables that should not be queryable via GraphQL.
REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE SELECT ON TABLE public.family_members FROM anon;
REVOKE SELECT ON TABLE public.calendar_events FROM anon;
REVOKE SELECT ON TABLE public.coordination_issues FROM anon;
REVOKE SELECT ON TABLE public.sms_conversations FROM anon;
REVOKE SELECT ON TABLE public.sms_messages FROM anon;
REVOKE SELECT ON TABLE public.morning_briefing_log FROM anon;
REVOKE SELECT ON TABLE public.households FROM anon;
REVOKE SELECT ON TABLE public.household_members FROM anon;
REVOKE SELECT ON TABLE public.user_preferences FROM anon;
REVOKE SELECT ON TABLE public.onboarding_progress FROM anon;
REVOKE SELECT ON TABLE public.family_member_preferences FROM anon;
REVOKE SELECT ON TABLE public.pickup_logistics FROM anon;
REVOKE SELECT ON TABLE public.smart_scheduling_rules FROM anon;
REVOKE SELECT ON TABLE public.notification_preferences FROM anon;
REVOKE SELECT ON TABLE public.waitlist_analytics FROM anon;
