create table public.morning_briefing_log (
  id uuid primary key default gen_random_uuid(),
  insight_key text not null,
  insight_summary text not null,
  category text,
  surfaced_at timestamptz not null default now(),
  briefing_date date not null default current_date,
  constraint unique_insight_per_day unique (insight_key, briefing_date)
);

create index idx_morning_briefing_log_briefing_date on public.morning_briefing_log (briefing_date);

alter table public.morning_briefing_log enable row level security;
