-- Cancellation and data retention
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_deletion_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reminded BOOLEAN DEFAULT FALSE;
