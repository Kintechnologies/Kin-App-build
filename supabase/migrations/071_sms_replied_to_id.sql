-- 071_sms_replied_to_id.sql
--
-- Audit v5 P2-S2: idempotency reply pairing race.
--
-- The inbound webhook's retry-cache (apps/web/src/app/api/sms/inbound/route.ts)
-- looks up the outbound reply for a retried inbound by selecting the first
-- outbound row for the inbound's profile_id whose sent_at >= the inbound's
-- sent_at. Two inbound messages from the same user landing within the same
-- second can mis-pair: a retry of inbound B finds the outbound emitted for
-- inbound A and returns A's reply.
--
-- Fix: an explicit replied_to_id FK on the outbound row. The cache becomes a
-- direct lookup (outbound WHERE replied_to_id = $inbound_id) — no time-order
-- approximation. Nullable so pre-existing rows and the few outbound paths
-- without an inbound counterpart (briefings, nudges, partner invites) keep
-- working unchanged.

ALTER TABLE sms_conversations
  ADD COLUMN IF NOT EXISTS replied_to_id UUID
    REFERENCES sms_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sms_conversations_replied_to_id
  ON sms_conversations (replied_to_id)
  WHERE replied_to_id IS NOT NULL;
