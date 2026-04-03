-- 025_chat_thread_types.sql
-- Adds thread_type to chat_threads to support the 3-tab pivot architecture.
-- Two persistent pinned threads per user: 'personal' + 'household'.
-- 'general' is the legacy ad-hoc thread type from the prior build.

ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS thread_type TEXT NOT NULL DEFAULT 'general'
    CHECK (thread_type IN ('personal', 'household', 'general'));

-- household_id: for household threads, points to the primary parent's profile id.
-- This allows both partners to see the same household thread.
ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Index for household thread lookups (partner visibility)
CREATE INDEX IF NOT EXISTS idx_chat_threads_household
  ON chat_threads (household_id, thread_type)
  WHERE thread_type = 'household';

-- Index for personal thread lookup (upsert on mount)
CREATE INDEX IF NOT EXISTS idx_chat_threads_personal
  ON chat_threads (profile_id, thread_type)
  WHERE thread_type = 'personal';

-- today_screen_first_opened: used to fire the first-use emotional moment once
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS today_screen_first_opened TIMESTAMPTZ;

-- first_name: convenience column (profiles may only have family_name today)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT;
