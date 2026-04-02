-- Chat threads for conversation history
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT, -- auto-generated from first message
  is_private BOOLEAN NOT NULL DEFAULT false, -- private = hidden from partner
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own threads" ON chat_threads
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_chat_threads_profile ON chat_threads(profile_id, updated_at DESC);

-- Add thread_id to conversations (nullable for backwards compat)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_conversations_thread ON conversations(thread_id, created_at);

-- Add parent_role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_role TEXT CHECK (parent_role IN ('mom', 'dad', 'parent'));
