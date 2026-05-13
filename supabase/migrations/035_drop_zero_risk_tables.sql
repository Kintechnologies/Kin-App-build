-- ═══════════════════════════════════════════════════════════════
-- 034 · Drop zero-risk stale tables (Pass 1)
-- ═══════════════════════════════════════════════════════════════
-- Post-pivot cleanup. These tables have zero code references anywhere
-- in the repo and were carried over from the pre-pivot product surface.
--   - "Waitlist"          duplicate of lowercase waitlist (0 rows)
--   - workout_sessions    fitness tracker (deprecated)
--   - children_details    superseded by family_members
--   - grocery_list_items  meal-planning grocery list (deprecated)
--   - daily_questions     prompts loop (deprecated)
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS "Waitlist" CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS children_details CASCADE;
DROP TABLE IF EXISTS grocery_list_items CASCADE;
DROP TABLE IF EXISTS daily_questions CASCADE;
