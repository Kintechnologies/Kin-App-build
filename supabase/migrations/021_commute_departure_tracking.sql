-- ═══════════════════════════════════════════════════════════════
-- 021 · Commute Departure Notification Tracking (D4)
-- ═══════════════════════════════════════════════════════════════
-- Adds a date field to parent_schedules to track when the commute
-- departure push was last sent — prevents duplicate notifications
-- within the same calendar day.

ALTER TABLE parent_schedules
  ADD COLUMN commute_departure_notified_date DATE;

COMMENT ON COLUMN parent_schedules.commute_departure_notified_date
  IS 'Date the commute departure push was last sent — max one per day.';
