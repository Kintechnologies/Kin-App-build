-- ══════════════════════════════════════════════════════════════
-- 009 · Calendar Sync — Events, Connections, Sync State
-- ══════════════════════════════════════════════════════════════

-- Calendar provider connections (one per parent per provider)
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  -- OAuth / auth tokens (encrypted at rest by Supabase)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  -- CalDAV-specific (Apple)
  caldav_url TEXT,
  -- Google-specific
  google_calendar_id TEXT DEFAULT 'primary',
  google_sync_token TEXT,          -- incremental sync token
  google_channel_id TEXT,          -- webhook channel ID
  google_channel_expiry TIMESTAMPTZ, -- webhook channel expiration
  google_resource_id TEXT,         -- webhook resource ID
  -- General
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  sync_error TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, provider)
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calendar connections"
  ON calendar_connections FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Calendar events (unified store — Kin-native + synced external)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id UUID REFERENCES profiles(id),  -- links to primary household profile
  -- Event data
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,            -- RRULE string if recurring
  color TEXT,                      -- hex color override
  -- Sync metadata
  external_id TEXT,                -- Google event ID or CalDAV UID
  external_source TEXT NOT NULL DEFAULT 'kin' CHECK (external_source IN ('google', 'apple', 'kin')),
  external_calendar_id TEXT,       -- specific calendar within the provider
  external_etag TEXT,              -- for change detection
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_push', 'pending_pull', 'error', 'conflict')),
  -- Privacy & sharing
  owner_parent_id UUID NOT NULL REFERENCES profiles(id),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_kid_event BOOLEAN NOT NULL DEFAULT false,  -- always shared
  assigned_member TEXT,            -- name of kid/pet this event is for
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ           -- soft delete for sync
);

-- Indexes for common queries
CREATE INDEX idx_events_profile ON calendar_events(profile_id, start_time);
CREATE INDEX idx_events_owner ON calendar_events(owner_parent_id, start_time);
CREATE INDEX idx_events_external ON calendar_events(external_id, external_source);
CREATE INDEX idx_events_sync ON calendar_events(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_events_household ON calendar_events(household_id, start_time) WHERE (is_shared = true OR is_kid_event = true);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Parent can see: own events + shared household events + kid events
CREATE POLICY "Users read own and shared events"
  ON calendar_events FOR SELECT
  USING (
    auth.uid() = owner_parent_id
    OR (is_shared = true AND household_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    OR (is_kid_event = true AND household_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users manage own events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = owner_parent_id);

CREATE POLICY "Users update own events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = owner_parent_id)
  WITH CHECK (auth.uid() = owner_parent_id);

CREATE POLICY "Users delete own events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = owner_parent_id);

-- Calendar conflicts detected by sync
CREATE TABLE calendar_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES profiles(id),
  event_a_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  event_b_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('time_overlap', 'kid_conflict', 'meal_conflict')),
  description TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read household conflicts"
  ON calendar_conflicts FOR ALL
  USING (household_id = auth.uid())
  WITH CHECK (household_id = auth.uid());

-- Sync queue for retry logic
CREATE TABLE calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync queue"
  ON calendar_sync_queue FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE profile_id = auth.uid()
    )
  );
