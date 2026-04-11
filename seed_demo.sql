-- ─────────────────────────────────────────────────────────────────────────────
-- Kin AI — Demo Seed Script
-- Jordan Mitchell (demo@kinai.family) + Sam Mitchell (partner@kinai.family)
-- Run with: supabase db execute --file seed_demo.sql  (from your kin/ directory)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  jordan_id UUID := 'a94cbe64-e03f-4a3b-8cd5-a3e0f4742eda';
  sam_id    UUID := 'a75b11a3-8884-4d59-b678-b583af865498';
  pt_id     UUID;  -- personal thread
  ht_id     UUID;  -- household thread

BEGIN

-- ── Profiles ──────────────────────────────────────────────────────────────────
UPDATE profiles SET
  first_name          = 'Jordan',
  family_name         = 'Mitchell',
  household_type      = 'two-parent',
  subscription_tier   = 'family',
  onboarding_completed = TRUE,
  parent_role         = 'parent'
WHERE id = jordan_id;

UPDATE profiles SET
  first_name          = 'Sam',
  family_name         = 'Mitchell',
  household_type      = 'two-parent',
  subscription_tier   = 'family',
  onboarding_completed = TRUE,
  parent_role         = 'parent',
  household_id        = jordan_id
WHERE id = sam_id;

-- ── Household invite (already accepted) ───────────────────────────────────────
INSERT INTO household_invites
  (inviter_profile_id, invitee_email, invite_code, accepted, accepted_by_profile_id, accepted_at, expires_at)
VALUES
  (jordan_id, 'partner@kinai.family', 'DEMO-SEED-2026', TRUE, sam_id,
   '2026-04-03T22:00:00Z', '2026-04-10T22:00:00Z')
ON CONFLICT (invite_code) DO NOTHING;

-- ── Calendar events ───────────────────────────────────────────────────────────
-- Saturday Apr 4 (today)
INSERT INTO calendar_events (profile_id, household_id, owner_parent_id, title, description, start_time, end_time, all_day, is_shared, is_kid_event, assigned_member, color, external_source, sync_status) VALUES
  (jordan_id, jordan_id, jordan_id, 'Farmers Market',         'Grand Ave — bring bags',            '2026-04-04T13:00:00Z','2026-04-04T14:00:00Z', FALSE, TRUE,  FALSE, NULL,   '#7AADCE','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Morning run',            NULL,                                '2026-04-04T11:00:00Z','2026-04-04T12:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Emma''s soccer practice',NULL,                                '2026-04-04T14:30:00Z','2026-04-04T16:00:00Z', FALSE, FALSE, TRUE,  'Emma', '#7CB87A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Dentist appointment',    'Dr. Patel — annual cleaning',        '2026-04-04T19:00:00Z','2026-04-04T20:00:00Z', FALSE, FALSE, FALSE, NULL,   '#7AADCE','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Q2 Finance review call', 'Zoom with Ryan + team',              '2026-04-04T19:00:00Z','2026-04-04T20:30:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Nora''s swim lesson',    NULL,                                '2026-04-04T21:00:00Z','2026-04-04T22:00:00Z', FALSE, FALSE, TRUE,  'Nora', '#7CB87A','kin','synced'),

-- Sunday Apr 5
  (jordan_id, jordan_id, jordan_id, 'Grocery run',            NULL,                                '2026-04-05T12:00:00Z','2026-04-05T13:00:00Z', FALSE, FALSE, FALSE, NULL,   '#7AADCE','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Emma''s soccer game',    'Away game — Riverside Park',         '2026-04-05T14:00:00Z','2026-04-05T16:00:00Z', FALSE, FALSE, TRUE,  'Emma', '#7CB87A','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Brunch with Nadia',      NULL,                                '2026-04-05T15:00:00Z','2026-04-05T17:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Dinner — Patel family',  'Their place — bring wine',           '2026-04-05T23:00:00Z','2026-04-06T01:00:00Z', FALSE, TRUE,  FALSE, NULL,   '#D4748A','kin','synced'),

-- Monday Apr 6
  (jordan_id, jordan_id, jordan_id, 'Team standup',           NULL,                                '2026-04-06T13:00:00Z','2026-04-06T13:30:00Z', FALSE, FALSE, FALSE, NULL,   '#7AADCE','kin','synced'),
  (sam_id,    jordan_id, sam_id,    '1:1 with manager',       NULL,                                '2026-04-06T15:00:00Z','2026-04-06T16:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'School pickup — Emma & Nora', NULL,                           '2026-04-06T19:00:00Z','2026-04-06T19:30:00Z', FALSE, FALSE, TRUE,  'Emma', '#7CB87A','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Book club',              'At Julia''s — The God of Small Things','2026-04-06T22:30:00Z','2026-04-07T00:00:00Z', FALSE, FALSE, FALSE, NULL, '#D4748A','kin','synced'),

-- Tuesday Apr 7
  (sam_id,    jordan_id, sam_id,    'Morning gym',            NULL,                                '2026-04-07T11:00:00Z','2026-04-07T12:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Nora''s pediatrician',   '18-month checkup + vaccines',        '2026-04-07T18:00:00Z','2026-04-07T19:00:00Z', FALSE, FALSE, TRUE,  'Nora', '#7CB87A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Date night',             'Reservation at Oleana, 7pm',         '2026-04-07T23:00:00Z','2026-04-08T01:00:00Z', FALSE, TRUE,  FALSE, NULL,   '#7AADCE','kin','synced'),

-- Wednesday Apr 8
  (jordan_id, jordan_id, jordan_id, 'All-hands meeting',      NULL,                                '2026-04-08T14:00:00Z','2026-04-08T15:00:00Z', FALSE, FALSE, FALSE, NULL,   '#7AADCE','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Lunch with Sarah',       NULL,                                '2026-04-08T16:00:00Z','2026-04-08T17:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Emma''s soccer practice',NULL,                                '2026-04-08T20:00:00Z','2026-04-08T21:00:00Z', FALSE, FALSE, TRUE,  'Emma', '#7CB87A','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Work late',              NULL,                                '2026-04-08T21:00:00Z','2026-04-08T23:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),

-- Thursday Apr 9
  (jordan_id, jordan_id, jordan_id, 'School pickup',          NULL,                                '2026-04-09T19:00:00Z','2026-04-09T19:30:00Z', FALSE, FALSE, TRUE,  'Emma', '#7CB87A','kin','synced'),
  (sam_id,    jordan_id, sam_id,    'Happy hour with team',   NULL,                                '2026-04-09T21:00:00Z','2026-04-09T23:00:00Z', FALSE, FALSE, FALSE, NULL,   '#D4748A','kin','synced'),
  (jordan_id, jordan_id, jordan_id, 'Dinner — Grandma''s',   NULL,                                '2026-04-09T22:00:00Z','2026-04-10T00:00:00Z', FALSE, TRUE,  FALSE, NULL,   '#7AADCE','kin','synced');

-- ── Coordination issues ───────────────────────────────────────────────────────
-- OPEN RED — today's pickup risk
INSERT INTO coordination_issues (household_id, trigger_type, state, severity, content, event_window_start, event_window_end, surfaced_at) VALUES
  (jordan_id, 'pickup_risk', 'OPEN', 'RED',
   'Both parents are unavailable for Nora''s 5pm swim lesson. Jordan''s dentist runs until 4pm; Sam''s finance review runs until 4:30pm — no confirmed coverage.',
   '2026-04-04T21:00:00Z', '2026-04-04T22:00:00Z', '2026-04-04T12:30:00Z');

-- ACKNOWLEDGED YELLOW — Monday book club late schedule change
INSERT INTO coordination_issues (household_id, trigger_type, state, severity, content, event_window_start, event_window_end, surfaced_at, acknowledged_at) VALUES
  (jordan_id, 'late_schedule_change', 'ACKNOWLEDGED', 'YELLOW',
   'Sam''s book club moved to 6:30pm Monday — overlaps with the 3:30pm school pickup window. Jordan is the only available parent for pickup.',
   '2026-04-06T19:00:00Z', '2026-04-06T22:30:00Z', '2026-04-03T23:00:00Z', '2026-04-04T00:15:00Z');

-- RESOLVED — yesterday's pickup issue (complete state machine demo)
INSERT INTO coordination_issues (household_id, trigger_type, state, severity, content, event_window_start, event_window_end, surfaced_at, acknowledged_at, resolved_at) VALUES
  (jordan_id, 'pickup_risk', 'RESOLVED', 'YELLOW',
   'Sam''s afternoon meeting conflicted with Emma''s 3:30pm school pickup. Jordan covered it.',
   '2026-04-03T19:30:00Z', '2026-04-03T20:00:00Z', '2026-04-03T14:00:00Z', '2026-04-03T14:45:00Z', '2026-04-03T20:15:00Z');

-- ── Chat threads ──────────────────────────────────────────────────────────────
INSERT INTO chat_threads (id, profile_id, thread_type, title, created_at, updated_at)
VALUES (gen_random_uuid(), jordan_id, 'personal', 'Kin', '2026-04-02T14:00:00Z', '2026-04-04T02:00:00Z')
RETURNING id INTO pt_id;

INSERT INTO chat_threads (id, profile_id, thread_type, household_id, title, created_at, updated_at)
VALUES (gen_random_uuid(), jordan_id, 'household', jordan_id, 'Home', '2026-04-02T14:00:00Z', '2026-04-04T00:15:00Z')
RETURNING id INTO ht_id;

-- ── Personal thread messages ───────────────────────────────────────────────────
INSERT INTO conversations (profile_id, thread_id, role, content, created_at) VALUES
  (jordan_id, pt_id, 'user',      'Hey — can you remind me what''s on my plate this week?',                                                                                         '2026-04-02T13:00:00Z'),
  (jordan_id, pt_id, 'assistant', 'Three things worth staying ahead of: Nora''s pediatrician Tuesday at 2pm, the all-hands Wednesday morning, and date night Tuesday — reservation at Oleana at 7pm. The week looks manageable.', '2026-04-02T13:00:10Z'),
  (jordan_id, pt_id, 'user',      'What time does Oleana open? Should I confirm the reservation?',                                                                                   '2026-04-02T13:05:00Z'),
  (jordan_id, pt_id, 'assistant', 'They open at 5:30pm for dinner. Your reservation''s at 7pm — I''d confirm by tomorrow afternoon to be safe.',                                    '2026-04-02T13:05:12Z'),
  (jordan_id, pt_id, 'user',      'Done. Sam mentioned possibly adding something Monday evening — will that conflict with pickup?',                                                  '2026-04-03T18:00:00Z'),
  (jordan_id, pt_id, 'assistant', 'It would. School pickup for Emma and Nora is at 3:30pm Monday. If Sam''s tied up Monday evening, you''re covering both pickup and dinner solo. I''ll flag it when the calendar updates.', '2026-04-03T18:00:14Z'),
  (jordan_id, pt_id, 'user',      'Yeah, flag it. Thanks.',                                                                                                                         '2026-04-03T18:03:00Z'),
  (jordan_id, pt_id, 'assistant', 'I''ll keep an eye on it.',                                                                                                                       '2026-04-03T18:03:08Z');

-- ── Household thread messages ──────────────────────────────────────────────────
INSERT INTO conversations (profile_id, thread_id, role, content, created_at) VALUES
  (jordan_id, ht_id, 'user',      'Sam added book club Monday at 6:30. That overlaps with my pickup window.',                                                                       '2026-04-03T23:00:00Z'),
  (jordan_id, ht_id, 'assistant', 'Flagged it — you''re the only available parent for the 3:30pm pickup if Sam''s book club starts at 6:30pm. Tight but workable if you leave by 3:15pm.', '2026-04-03T23:00:12Z'),
  (jordan_id, ht_id, 'user',      'What about Tuesday? Are we actually free for date night?',                                                                                       '2026-04-03T23:10:00Z'),
  (jordan_id, ht_id, 'assistant', 'Tuesday evening is clear for both of you. Nora''s pediatrician is at 2pm and should be done by 3pm. Nothing else until your 7pm reservation.',  '2026-04-03T23:10:11Z'),
  (jordan_id, ht_id, 'user',      'Perfect. Don''t let anything get scheduled over it.',                                                                                            '2026-04-03T23:14:00Z'),
  (jordan_id, ht_id, 'assistant', 'I''ll flag anything that lands Tuesday evening.',                                                                                                '2026-04-03T23:14:07Z');

-- ── Check-ins ─────────────────────────────────────────────────────────────────
INSERT INTO kin_check_ins (profile_id, household_id, content, prompt, dismissed, check_in_date) VALUES
  (jordan_id, jordan_id,
   'Dinner''s in about 3 hours — nothing on the calendar tonight.',
   'Want to flag what you''re making so Sam knows?',
   FALSE, '2026-04-04'),
  (jordan_id, jordan_id,
   'Emma''s soccer practice ends at noon — you''ve got a 3-hour window before your dentist.',
   NULL,
   TRUE, '2026-04-04');

RAISE NOTICE 'Seed complete — Jordan: % | Sam: %', jordan_id, sam_id;
END $$;
