-- ═══════════════════════════════════════════════════════════════
-- 022 · Medication & Vaccination Notification Tracking (C4.6/C4.7)
-- ═══════════════════════════════════════════════════════════════
-- Adds date-tracking columns so daily medication pushes and
-- vaccination reminders fire at most once per period.

-- C4.6: Track the last date a daily medication reminder was sent
-- for each active medication. One push per medication per day.
ALTER TABLE pet_medications
  ADD COLUMN med_notified_date DATE;

COMMENT ON COLUMN pet_medications.med_notified_date
  IS 'Date the daily medication reminder push was last sent — max one per day per medication.';

-- C4.7: Track the last due-year a 7-day vaccination reminder was sent.
-- Storing the year of next_due_date avoids re-notifying when next_due_date
-- advances to the following year after a booster.
ALTER TABLE pet_vaccinations
  ADD COLUMN vax_7day_notified_due_date DATE,
  ADD COLUMN vax_1day_notified_due_date DATE;

COMMENT ON COLUMN pet_vaccinations.vax_7day_notified_due_date
  IS 'The next_due_date value for which a 7-day reminder was last sent.';

COMMENT ON COLUMN pet_vaccinations.vax_1day_notified_due_date
  IS 'The next_due_date value for which a 1-day reminder was last sent.';
