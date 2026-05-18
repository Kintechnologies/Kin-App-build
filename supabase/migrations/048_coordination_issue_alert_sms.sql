-- ─────────────────────────────────────────────────────────────────────────────
-- 048_coordination_issue_alert_sms.sql
--
-- Records when the proactive heads-up SMS was sent for a coordination_issue.
--
-- The intra-day pickup-risk detector (lib/pickup-risk.ts) creates a
-- coordination_issue as soon as it spots a pickup conflict — often hours ahead,
-- at the 6am briefing run — but only texts the family ~30 minutes before the
-- pickup, while there is still time to react. alert_sms_sent_at marks when that
-- text went out so subsequent cron ticks never re-alert the same conflict.
--
-- NULL = no proactive SMS sent yet (the common case for a freshly-created or a
-- pre-migration legacy issue).
-- ─────────────────────────────────────────────────────────────────────────────

alter table coordination_issues
  add column if not exists alert_sms_sent_at timestamptz;

comment on column coordination_issues.alert_sms_sent_at is
  'When the proactive pickup-risk SMS was sent for this issue. NULL = not yet sent.';
