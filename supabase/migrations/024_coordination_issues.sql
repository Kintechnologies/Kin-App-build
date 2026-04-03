-- 024_coordination_issues.sql
-- Coordination issue state table — powers Today screen alert cards.
-- OPEN → ACKNOWLEDGED → RESOLVED state machine per intelligence engine spec §12.

create table if not exists coordination_issues (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  trigger_type text not null check (
    trigger_type in (
      'pickup_risk',
      'late_schedule_change',
      'schedule_compression',
      'responsibility_shift',
      'budget_overspend',
      'other'
    )
  ),
  state text not null default 'OPEN' check (state in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  content text not null,
  event_window_start timestamptz,
  event_window_end timestamptz,
  surfaced_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  last_escalation_tier text check (last_escalation_tier in ('T6', 'T2', 'T45')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast household queries (Today screen loads all active issues on mount)
create index if not exists coordination_issues_household_state_idx
  on coordination_issues (household_id, state, surfaced_at desc);

-- Row-level security: users can only see issues for their own household
alter table coordination_issues enable row level security;

create policy "Users can view their household's coordination issues"
  on coordination_issues for select
  using (
    household_id in (
      select household_id from profiles where id = auth.uid()
    )
  );

create policy "Users can insert coordination issues for their household"
  on coordination_issues for insert
  with check (
    household_id in (
      select household_id from profiles where id = auth.uid()
    )
  );

create policy "Users can update coordination issues for their household"
  on coordination_issues for update
  using (
    household_id in (
      select household_id from profiles where id = auth.uid()
    )
  );

-- Auto-update updated_at on row changes
create or replace function update_coordination_issues_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger coordination_issues_updated_at
  before update on coordination_issues
  for each row execute function update_coordination_issues_updated_at();
