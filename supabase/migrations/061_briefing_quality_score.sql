-- ─────────────────────────────────────────────────────────────────────────────
-- 061_briefing_quality_score.sql
--
-- Runtime quality score for each delivered briefing.
--
-- The morning-briefing edge function scores every generated briefing against
-- the SYSTEM_PROMPT rubric (see supabase/functions/_shared/briefing-quality.ts)
-- using Claude Haiku before SMS delivery. The score, letter grade, and the
-- list of issues the judge flagged are persisted here so we have historical
-- quality data — for trend dashboards, regression detection, and triage when
-- Slack alerts fire.
--
-- Scoring is non-blocking: if the judge call fails these columns stay NULL and
-- the briefing is still delivered.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE morning_briefings
  ADD COLUMN IF NOT EXISTS quality_score INTEGER
    CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS quality_grade TEXT
    CHECK (quality_grade IS NULL OR quality_grade IN ('A', 'B', 'C', 'D', 'F')),
  ADD COLUMN IF NOT EXISTS quality_issues JSONB;

-- Score-based queries (e.g. "all failing briefings this week") are the main
-- read pattern; index on date + score so they stay cheap.
CREATE INDEX IF NOT EXISTS idx_morning_briefings_quality
  ON morning_briefings (briefing_date DESC, quality_score)
  WHERE quality_score IS NOT NULL;
