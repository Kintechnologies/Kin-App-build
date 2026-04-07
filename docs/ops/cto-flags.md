# CTO Flags — P0 Issues

> These MUST be addressed by Lead Engineer before the next deployment.
> Last updated: 2026-04-06 (Run 3)

---

## ✅ No open P0 flags.

---

## RESOLVED FLAGS (audit trail)

| Flag | Issue | Resolution |
|---|---|---|
| FLAG-001 | Duplicate migration `027_` prefix | `027_profile_timezone.sql` stub removed; `027_coordination_issues_severity.sql` is a legitimate new migration with a real `ALTER TABLE`. Resolved prior to Run 2. |
| FLAG-002 | RevenueCat webhook no Sentry — silent revenue errors | `import * as Sentry` added; `Sentry.captureException(error)` in outer catch at line 147–148. Resolved prior to Run 2. |
| FLAG-003 | pickup-risk cron auth bypassed when CRON_SECRET unset | Auth guard now uses `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)` — tight pattern, consistent with other cron routes. Resolved prior to Run 2. |
| FLAG-004 | DELETE /api/account FK constraint violations for paired users | `createAdminClient()` nulls `profiles.household_id` and `household_invites.accepted_by_profile_id` before profile delete; dead `invited_by` column reference removed. Tests added in `account-delete.test.ts`. Resolved Run 3. |
