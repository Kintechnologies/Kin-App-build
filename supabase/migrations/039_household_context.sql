-- 039_household_context.sql
-- "Smart House" foundation: a household knowledge graph Kin builds up over time
-- by learning family patterns from SMS conversations.
--
-- Four stores, all scoped to a household:
--   household_context   — key/value learned facts ("Dad does school dropoff")
--   family_members      — kids, grandparents, sitters, pets (extends 002 table)
--   family_routines     — recurring patterns (school, work, activities, meals)
--   family_preferences  — learned likes/dislikes, dietary restrictions, etc.
--
-- Household identity follows the existing convention used by calendar_events
-- and coordination_issues: household_id = the PRIMARY parent's profile id.
-- A profile is the primary when profiles.household_id IS NULL; a partner's
-- profiles.household_id points at that primary. So for any profile P the
-- household id is COALESCE(P.household_id, P.id).
--
-- Every learned row carries provenance (source_conversation_id), a confidence
-- score, an observation_count (bumped on re-confirmation), and updated_at.

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- True when the calling user belongs to household `hid`. Mirrors the inline
-- check used by coordination_issues RLS. SECURITY INVOKER: the profiles
-- subquery runs as the caller, who can always read their own profile row.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select hid is not null and (
    hid = auth.uid()
    or hid = (select p.household_id from public.profiles p where p.id = auth.uid())
  );
$$;

-- Shared updated_at trigger function.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── family_members: extend the existing (002) table ─────────────────────────
-- The original table is keyed only to profile_id with no household scope,
-- relationship label, provenance, or confidence. Add those so the conversation
-- intelligence layer can write learned members and partners can see them.

alter table family_members
  add column if not exists household_id uuid references profiles(id) on delete cascade,
  add column if not exists relationship text,
  add column if not exists notes text,
  add column if not exists confidence numeric(3,2) not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  add column if not exists source_conversation_id uuid
    references sms_conversations(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill household_id for rows that predate this migration.
update family_members fm
set household_id = coalesce(
  (select p.household_id from profiles p where p.id = fm.profile_id),
  fm.profile_id
)
where fm.household_id is null;

create index if not exists idx_family_members_household
  on family_members(household_id);

-- Existing policy "Users can manage own family members" (profile_id = auth.uid())
-- stays. Add a household-scoped policy so a partner can see/manage shared
-- members even when profile_id points at the other parent.
drop policy if exists "Household members manage family members" on family_members;
create policy "Household members manage family members" on family_members
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop trigger if exists family_members_touch_updated_at on family_members;
create trigger family_members_touch_updated_at
  before update on family_members
  for each row execute function touch_updated_at();

-- ── household_context: key/value learned facts ──────────────────────────────

create table if not exists household_context (
  id                     uuid        primary key default gen_random_uuid(),
  household_id           uuid        not null references profiles(id) on delete cascade,
  fact_key               text        not null,
  fact_value             text        not null,
  category               text        not null default 'general'
    check (category in ('routine','logistics','people','preference','health','general')),
  confidence             numeric(3,2) not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  observation_count      integer     not null default 1,
  source_conversation_id uuid        references sms_conversations(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- One row per distinct fact per household — the dedup backstop.
  unique (household_id, fact_key)
);

create index if not exists idx_household_context_household
  on household_context(household_id);

alter table household_context enable row level security;

create policy "Household members manage household_context" on household_context
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create trigger household_context_touch_updated_at
  before update on household_context
  for each row execute function touch_updated_at();

-- ── family_routines: recurring patterns ─────────────────────────────────────

create table if not exists family_routines (
  id                     uuid        primary key default gen_random_uuid(),
  household_id           uuid        not null references profiles(id) on delete cascade,
  routine_type           text        not null
    check (routine_type in ('school','work','activity','meal','bedtime','chore','other')),
  title                  text        not null,
  description            text,
  family_member_id       uuid        references family_members(id) on delete set null,
  days_of_week           text[]      not null default '{}',
  start_time             time,
  end_time               time,
  location               text,
  confidence             numeric(3,2) not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  observation_count      integer     not null default 1,
  active                 boolean     not null default true,
  source_conversation_id uuid        references sms_conversations(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (household_id, routine_type, title)
);

create index if not exists idx_family_routines_household
  on family_routines(household_id, active);

alter table family_routines enable row level security;

create policy "Household members manage family_routines" on family_routines
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create trigger family_routines_touch_updated_at
  before update on family_routines
  for each row execute function touch_updated_at();

-- ── family_preferences: learned likes/dislikes ──────────────────────────────

create table if not exists family_preferences (
  id                     uuid        primary key default gen_random_uuid(),
  household_id           uuid        not null references profiles(id) on delete cascade,
  preference_type        text        not null
    check (preference_type in ('food','dietary_restriction','restaurant','activity','entertainment','communication','other')),
  -- NULL family_member_id = a household-wide preference.
  family_member_id       uuid        references family_members(id) on delete set null,
  label                  text        not null,
  value                  text        not null,
  sentiment              text        not null default 'like'
    check (sentiment in ('love','like','neutral','dislike','avoid')),
  confidence             numeric(3,2) not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  observation_count      integer     not null default 1,
  source_conversation_id uuid        references sms_conversations(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Backstop dedup. Rows with a NULL family_member_id are not caught here
  -- (NULLs compare distinct), so the intelligence layer also dedups in code.
  unique (household_id, preference_type, label, family_member_id)
);

create index if not exists idx_family_preferences_household
  on family_preferences(household_id);

alter table family_preferences enable row level security;

create policy "Household members manage family_preferences" on family_preferences
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create trigger family_preferences_touch_updated_at
  before update on family_preferences
  for each row execute function touch_updated_at();

-- ── Hardening: keep these tables off the anon GraphQL/PostgREST surface ──────
-- Matches migration 037. authenticated keeps access; RLS filters rows.
revoke select on table household_context  from anon;
revoke select on table family_routines    from anon;
revoke select on table family_preferences from anon;
