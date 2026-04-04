-- 027_coordination_issues_severity.sql
-- Add severity column to coordination_issues table.
--
-- Required by alert-prompt.md (IE S1.7): the AI alert generation prompt returns a
-- `severity` field ("RED" | "YELLOW") alongside `content` and `trigger_type`.
-- Without this column, wiring the alert-prompt into pickup-risk.ts and
-- late-schedule-change.ts would produce a schema mismatch on insert.
--
-- Severity definitions (spec §3A):
--   RED    — both parents conflicted, no coverage confirmed
--   YELLOW — default handler unavailable but backup may exist
--   (CLEAR is suppressed — no issue is created for CLEAR severity)

alter table coordination_issues
  add column if not exists severity text;

comment on column coordination_issues.severity is
  'Alert severity level from AI generation: RED | YELLOW. NULL for legacy rows created before migration 027.';
