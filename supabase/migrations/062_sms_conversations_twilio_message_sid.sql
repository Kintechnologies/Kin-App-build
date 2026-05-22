-- ─────────────────────────────────────────────────────────────────────────────
-- 062_sms_conversations_twilio_message_sid.sql
--
-- Idempotency for the Twilio inbound SMS webhook.
--
-- Twilio retries webhook POSTs on 5xx or network failure (default 3 attempts).
-- Each retry re-enters /api/sms/inbound with the same MessageSid, which today
-- produces:
--   - a duplicate sms_conversations row (corrupting the conversation history
--     fed back into morning briefings and the Q&A system prompt)
--   - a duplicate Claude call (cost amplification, ~2× per retry)
--   - duplicate outbound TwiML, so the user receives the same reply twice
--
-- The fix: record Twilio's MessageSid on the inbound row and enforce a unique
-- constraint on it. The handler checks for an existing row by MessageSid
-- before doing any work, and returns the cached outbound reply if it finds
-- one. The unique constraint is scoped to inbound rows only — outbound rows
-- don't get a Twilio SID until after delivery and shouldn't share namespace.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sms_conversations
  ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT;

-- Partial unique index: enforces idempotency for inbound rows, while leaving
-- outbound rows (which insert with NULL) unconstrained. Twilio MessageSids are
-- globally unique strings of the form SM[32 hex chars] / MM[…], so collisions
-- across users would only happen on a real retry of the same upstream message.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sms_conversations_inbound_sid
  ON sms_conversations (twilio_message_sid)
  WHERE direction = 'inbound' AND twilio_message_sid IS NOT NULL;
