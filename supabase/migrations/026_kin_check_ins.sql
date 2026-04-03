-- 026_kin_check_ins.sql
-- Kin check-in cards — proactive prompts surfaced on the Today screen.
-- Max 2 per user per day (enforced in app per intelligence engine spec §5).
-- Dismissed state persists across app restarts.

create table if not exists kin_check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  household_id uuid references profiles(id) on delete cascade,
  content text not null,           -- observation: "Dinner's in 2 hours."
  prompt text,                     -- optional follow-up: "Want me to pull something quick?"
  dismissed boolean not null default false,
  check_in_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Index for Today screen query (profile + date + dismissed)
create index if not exists kin_check_ins_profile_date_idx
  on kin_check_ins (profile_id, check_in_date, dismissed);

-- RLS: users can see their own check-ins only
alter table kin_check_ins enable row level security;

create policy "Users can view their own check-ins"
  on kin_check_ins for select
  using (profile_id = auth.uid());

create policy "Users can update their own check-ins"
  on kin_check_ins for update
  using (profile_id = auth.uid());

create policy "Service role can insert check-ins"
  on kin_check_ins for insert
  with check (
    profile_id in (
      select id from profiles where id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
